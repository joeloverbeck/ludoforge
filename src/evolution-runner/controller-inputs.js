/**
 * Pure function to compute inputs for the preference controller
 * from evaluated genomes and preference model state.
 *
 * No I/O — deterministic given identical inputs.
 *
 * @module evolution-runner/controller-inputs
 */

import { computePreferenceScore } from "../evaluation-analytics/preference-scoring.js";

/**
 * Extract metric IDs from evaluated entries' feature vectors.
 *
 * @param {Array<{ diagnostics?: { featureVector?: Record<string, number> } }>} evaluated
 * @returns {string[]} sorted metric IDs
 */
function extractMetricIds(evaluated) {
  const ids = new Set();
  for (const entry of evaluated) {
    const fv = entry?.diagnostics?.featureVector;
    if (fv && typeof fv === "object") {
      for (const key of Object.keys(fv)) {
        ids.add(key);
      }
    }
  }
  return Array.from(ids).sort();
}

/**
 * Compute mean uncertainty across evaluated entries using the preference model.
 *
 * @param {object} preferenceModelState
 * @param {Array<{ diagnostics?: { featureVector?: Record<string, number> } }>} evaluated
 * @returns {number} mean uncertainty, or 0 if no valid entries
 */
function computeMeanUncertainty(preferenceModelState, evaluated) {
  if (!preferenceModelState || !Array.isArray(evaluated) || evaluated.length === 0) {
    return 0;
  }
  let total = 0;
  let count = 0;
  for (const entry of evaluated) {
    const fv = entry?.diagnostics?.featureVector;
    if (!fv || typeof fv !== "object") {
      continue;
    }
    const { uncertainty } = computePreferenceScore(preferenceModelState, fv);
    if (Number.isFinite(uncertainty)) {
      total += uncertainty;
      count += 1;
    }
  }
  return count > 0 ? total / count : 0;
}

/**
 * Determine whether new metric IDs have appeared compared to the previous set.
 *
 * @param {string[]} currentIds
 * @param {string[]|null} previousIds
 * @returns {boolean}
 */
function detectNewMetricIds(currentIds, previousIds) {
  if (!Array.isArray(currentIds) || currentIds.length === 0) {
    return false;
  }
  if (!Array.isArray(previousIds) || previousIds.length === 0) {
    return false;
  }
  const prev = new Set(previousIds);
  for (const id of currentIds) {
    if (!prev.has(id)) {
      return true;
    }
  }
  return false;
}

/**
 * Compute all inputs needed by `advanceController()`.
 *
 * @param {object} params
 * @param {Array} params.evaluated - evaluated entries from the generation loop
 * @param {object|null} params.preferenceModelState - current preference model state (from latest snapshot)
 * @param {number} params.totalSamples - cumulative feedback sample count
 * @param {string[]|null} params.previousMetricIds - metric IDs from the previous generation
 * @returns {{ totalSamples: number, meanUncertainty: number, hasNewMetricIds: boolean, metricIds: string[] }}
 */
export function computeControllerInputs({
  evaluated,
  preferenceModelState,
  totalSamples,
  previousMetricIds,
}) {
  const entries = Array.isArray(evaluated) ? evaluated : [];
  const metricIds = extractMetricIds(entries);
  const meanUncertainty = computeMeanUncertainty(preferenceModelState, entries);
  const hasNewMetricIds = detectNewMetricIds(metricIds, previousMetricIds);

  return {
    totalSamples,
    meanUncertainty,
    hasNewMetricIds,
    metricIds,
  };
}
