import { computePreferenceScore } from "../evaluation-analytics/preference-scoring.js";

const DEFAULT_LOW_UNCERTAINTY_THRESHOLD = 0.1;
const DEFAULT_HIGH_UNCERTAINTY_THRESHOLD = 0.35;

function normalizeBaseMaxSamples(value) {
  const base = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, base);
}

function hasNewMetricIds(metricIds, previousMetricIds) {
  if (!Array.isArray(metricIds) || metricIds.length === 0) {
    return false;
  }
  if (!Array.isArray(previousMetricIds) || previousMetricIds.length === 0) {
    return false;
  }
  const previous = new Set(previousMetricIds);
  for (const id of metricIds) {
    if (!previous.has(id)) {
      return true;
    }
  }
  return false;
}

function computeMeanUncertainty(preferenceModelState, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  let total = 0;
  let count = 0;
  for (const candidate of candidates) {
    const featureVector = candidate?.featureVector;
    if (!featureVector || typeof featureVector !== "object") {
      continue;
    }
    const { uncertainty } = computePreferenceScore(preferenceModelState, featureVector);
    if (!Number.isFinite(uncertainty)) {
      continue;
    }
    total += uncertainty;
    count += 1;
  }
  return count > 0 ? total / count : null;
}

export function computeAdaptiveBudget({
  preferenceModelState,
  baseMaxSamples,
  metricIds,
  previousMetricIds,
  candidates,
  lowUncertaintyThreshold,
  highUncertaintyThreshold,
  enabled,
} = {}) {
  const baseBudget = normalizeBaseMaxSamples(baseMaxSamples);
  if (enabled !== true) {
    return baseBudget;
  }

  if (hasNewMetricIds(metricIds, previousMetricIds)) {
    return Math.max(1, Math.ceil(baseBudget * 1.5));
  }

  const meanUncertainty = computeMeanUncertainty(preferenceModelState, candidates);
  if (!Number.isFinite(meanUncertainty)) {
    return baseBudget;
  }

  const lowThreshold = Number.isFinite(lowUncertaintyThreshold)
    ? lowUncertaintyThreshold
    : DEFAULT_LOW_UNCERTAINTY_THRESHOLD;
  const highThreshold = Number.isFinite(highUncertaintyThreshold)
    ? highUncertaintyThreshold
    : DEFAULT_HIGH_UNCERTAINTY_THRESHOLD;

  if (meanUncertainty >= highThreshold) {
    return Math.max(1, Math.ceil(baseBudget * 1.5));
  }
  if (meanUncertainty <= lowThreshold) {
    return Math.max(1, Math.floor(baseBudget * 0.5));
  }

  return baseBudget;
}
