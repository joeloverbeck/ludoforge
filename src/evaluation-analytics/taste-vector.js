/**
 * Taste vector distillation — extracts a human-readable summary of
 * ensemble preferences by computing per-feature mean/stddev weights
 * and ranking top positive/negative features.
 *
 * Pure function, no side-effects.
 *
 * @module evaluation-analytics/taste-vector
 */

/**
 * Collect the union of all feature ids across every ensemble model.
 * @param {Array<{weights: Record<string, number>}>} models
 * @returns {string[]}
 */
function collectFeatureIds(models) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const model of models) {
    for (const key of Object.keys(model.weights ?? {})) {
      ids.add(key);
    }
  }
  return [...ids].sort();
}

/**
 * Population standard deviation (σ, not sample s).
 * Returns 0 for length <= 1.
 * @param {number[]} values
 * @param {number} mean
 * @returns {number}
 */
function populationStddev(values, mean) {
  if (values.length <= 1) return 0;
  let sumSq = 0;
  for (const v of values) {
    const d = v - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
}

/**
 * Distill a taste vector from a preference model state's ensemble.
 *
 * @param {object} preferenceModelState
 * @param {Array<{weights: Record<string, number>, bias: number, sampleCount: number}>} preferenceModelState.models
 * @param {object} [options]
 * @param {number} [options.topK=5] — number of top positive/negative features to return
 * @returns {{
 *   features: Record<string, {meanWeight: number, stddevWeight: number}>,
 *   topPositive: Array<{featureId: string, meanWeight: number, stddevWeight: number}>,
 *   topNegative: Array<{featureId: string, meanWeight: number, stddevWeight: number}>,
 * }}
 */
export function distillTasteVector(preferenceModelState, options = {}) {
  const models = preferenceModelState?.models ?? [];
  const topK = Number.isFinite(options.topK) && options.topK > 0 ? options.topK : 5;

  if (models.length === 0) {
    return { features: {}, topPositive: [], topNegative: [] };
  }

  const featureIds = collectFeatureIds(models);

  /** @type {Record<string, {meanWeight: number, stddevWeight: number}>} */
  const features = {};

  for (const fid of featureIds) {
    const values = models.map((m) => (m.weights ?? {})[fid] ?? 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stddev = populationStddev(values, mean);
    features[fid] = { meanWeight: mean, stddevWeight: stddev };
  }

  // Sort by meanWeight descending for positive, ascending for negative.
  const entries = Object.entries(features).map(([featureId, stats]) => ({
    featureId,
    ...stats,
  }));

  const topPositive = entries
    .filter((e) => e.meanWeight > 0)
    .sort((a, b) => b.meanWeight - a.meanWeight)
    .slice(0, topK);

  const topNegative = entries
    .filter((e) => e.meanWeight < 0)
    .sort((a, b) => a.meanWeight - b.meanWeight)
    .slice(0, topK);

  return { features, topPositive, topNegative };
}
