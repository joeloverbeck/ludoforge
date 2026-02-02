import { computePreferenceScore } from "../evaluation-analytics/preference-scoring.js";

const DEFAULT_LOW_UNCERTAINTY_THRESHOLD = 0.1;
const DEFAULT_HIGH_UNCERTAINTY_THRESHOLD = 0.35;
const DEFAULT_SCALE_DOWN_FACTOR = 0.5;
const DEFAULT_SCALE_UP_FACTOR = 1.5;

function normalizeBaseMaxSamples(value) {
  const base = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, base);
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

/**
 * @param {object} options
 * @param {object} [options.preferenceModelState]
 * @param {number} [options.baseMaxSamples]
 * @param {string[]} [options.metricIds]
 * @param {string[]} [options.previousMetricIds]
 * @param {Array} [options.candidates]
 * @param {number} [options.lowUncertaintyThreshold]
 * @param {number} [options.highUncertaintyThreshold]
 * @param {number} [options.scaleDownFactor] - Factor to scale budget down (0..1], default 0.5
 * @param {number} [options.scaleUpFactor] - Factor to scale budget up [1..], default 1.5
 * @param {"scaleUp"|"forceUnfreeze"} [options.onNewMetricIds] - Behavior when new metric IDs appear, default "scaleUp"
 * @param {boolean} [options.enabled]
 * @returns {{ budget: number, unfreezeRequired: boolean }}
 */
export function computeAdaptiveBudget({
  preferenceModelState,
  baseMaxSamples,
  metricIds,
  previousMetricIds,
  candidates,
  lowUncertaintyThreshold,
  highUncertaintyThreshold,
  scaleDownFactor,
  scaleUpFactor,
  onNewMetricIds,
  enabled,
} = {}) {
  const baseBudget = normalizeBaseMaxSamples(baseMaxSamples);
  const downFactor = Number.isFinite(scaleDownFactor) ? scaleDownFactor : DEFAULT_SCALE_DOWN_FACTOR;
  const upFactor = Number.isFinite(scaleUpFactor) ? scaleUpFactor : DEFAULT_SCALE_UP_FACTOR;
  const newMetricIdsBehavior = onNewMetricIds === "forceUnfreeze" ? "forceUnfreeze" : "scaleUp";

  if (enabled !== true) {
    return { budget: baseBudget, unfreezeRequired: false };
  }

  // An untrained model (top-level sampleCount === 0) has no basis for uncertainty
  // claims. All weights are zero → sigmoid(0) = 0.5 for every prediction → zero
  // ensemble disagreement → artificially "low" uncertainty. Return base budget unchanged.
  // We only check the top-level sampleCount (set by createPreferenceModelState / updatePreferenceModelState).
  if (preferenceModelState != null
      && Number.isFinite(preferenceModelState.sampleCount)
      && preferenceModelState.sampleCount === 0) {
    return { budget: baseBudget, unfreezeRequired: false };
  }

  if (hasNewMetricIds(metricIds, previousMetricIds)) {
    const budget = Math.ceil(baseBudget * upFactor);
    const unfreezeRequired = newMetricIdsBehavior === "forceUnfreeze";
    return { budget, unfreezeRequired };
  }

  const meanUncertainty = computeMeanUncertainty(preferenceModelState, candidates);
  if (!Number.isFinite(meanUncertainty)) {
    return { budget: baseBudget, unfreezeRequired: false };
  }

  const lowThreshold = Number.isFinite(lowUncertaintyThreshold)
    ? lowUncertaintyThreshold
    : DEFAULT_LOW_UNCERTAINTY_THRESHOLD;
  const highThreshold = Number.isFinite(highUncertaintyThreshold)
    ? highUncertaintyThreshold
    : DEFAULT_HIGH_UNCERTAINTY_THRESHOLD;

  if (meanUncertainty >= highThreshold) {
    return { budget: Math.ceil(baseBudget * upFactor), unfreezeRequired: false };
  }
  if (meanUncertainty <= lowThreshold) {
    return { budget: Math.floor(baseBudget * downFactor), unfreezeRequired: false };
  }

  return { budget: baseBudget, unfreezeRequired: false };
}
