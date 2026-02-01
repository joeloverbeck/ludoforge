/**
 * Out-of-distribution (OOD) detection for preference learning.
 *
 * Pure functions — no I/O, deterministic given identical inputs.
 *
 * @module evaluation-analytics/ood-detection
 */

/**
 * @typedef {Record<string, number>} FeatureVector
 *
 * @typedef {object} TrainFeatureStats
 * @property {FeatureVector[]} vectors   Accumulated training feature vectors
 * @property {number}          p95       95th-percentile distance threshold
 *
 * @typedef {object} OodResult
 * @property {number} oodRate   Fraction of candidates exceeding p95 threshold, in [0,1]
 * @property {number} p95       The threshold used
 */

/**
 * Compute the cosine distance between two feature vectors.
 *
 * cosineDistance = 1 - cosineSimilarity.
 * If either vector has zero magnitude, returns 1 (maximally distant).
 *
 * @param {FeatureVector} a
 * @param {FeatureVector} b
 * @returns {number} Value in [0, 2] (though [0,1] is typical for non-negative features).
 */
export function cosineDistance(a, b) {
  const allKeys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key of allKeys) {
    const va = safeNum(a?.[key]);
    const vb = safeNum(b?.[key]);
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) {
    return 1;
  }
  const similarity = dot / denom;
  return 1 - similarity;
}

/**
 * Compute the L2 (Euclidean) distance between two feature vectors.
 *
 * @param {FeatureVector} a
 * @param {FeatureVector} b
 * @returns {number} Non-negative distance.
 */
export function l2Distance(a, b) {
  const allKeys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  let sumSq = 0;
  for (const key of allKeys) {
    const diff = safeNum(a?.[key]) - safeNum(b?.[key]);
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/**
 * Compute the mean feature vector from an array of feature vectors.
 *
 * @param {FeatureVector[]} vectors
 * @returns {FeatureVector}
 */
function computeMeanVector(vectors) {
  if (vectors.length === 0) {
    return {};
  }
  const sums = {};
  for (const vec of vectors) {
    for (const [key, value] of Object.entries(vec ?? {})) {
      const v = safeNum(value);
      sums[key] = (sums[key] ?? 0) + v;
    }
  }
  const mean = {};
  const n = vectors.length;
  for (const [key, total] of Object.entries(sums)) {
    mean[key] = total / n;
  }
  return mean;
}

/**
 * Compute the p-th percentile value from a sorted numeric array.
 *
 * Uses nearest-rank method.
 *
 * @param {number[]} sortedValues  Must already be sorted ascending.
 * @param {number}   p             Percentile in [0, 100].
 * @returns {number}
 */
function percentile(sortedValues, p) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(rank, sortedValues.length - 1));
  return sortedValues[index];
}

/**
 * Update (or initialize) training feature statistics from an array of
 * feature vectors.  Returns a new TrainFeatureStats — never mutates.
 *
 * @param {TrainFeatureStats | null} prev   Previous stats (null on first call).
 * @param {FeatureVector[]}          newVectors  New training feature vectors to add.
 * @param {object}                   [options]
 * @param {"cosine" | "l2"}          [options.featureDistance="cosine"]
 * @param {number}                   [options.maxStoredVectors=500]  Cap to bound memory.
 * @returns {TrainFeatureStats}
 */
export function updateTrainFeatureStats(prev, newVectors, options = {}) {
  const featureDistance = options.featureDistance ?? "cosine";
  const maxStored = options.maxStoredVectors ?? 500;

  const combined = [...(prev?.vectors ?? []), ...newVectors];
  const capped = combined.length > maxStored
    ? combined.slice(combined.length - maxStored)
    : combined;

  if (capped.length === 0) {
    return { vectors: [], p95: 0 };
  }

  const distFn = featureDistance === "l2" ? l2Distance : cosineDistance;
  const mean = computeMeanVector(capped);

  const distances = capped.map((v) => distFn(v, mean));
  const sorted = [...distances].sort((a, b) => a - b);
  const p95 = percentile(sorted, 95);

  return { vectors: capped, p95 };
}

/**
 * Compute the OOD rate: fraction of candidate feature vectors whose
 * distance from the training mean exceeds the p95 threshold.
 *
 * @param {TrainFeatureStats} trainStats
 * @param {FeatureVector[]}   candidates  Feature vectors to test.
 * @param {object}            [options]
 * @param {"cosine" | "l2"}   [options.featureDistance="cosine"]
 * @returns {OodResult}
 */
export function computeOodRate(trainStats, candidates, options = {}) {
  const featureDistance = options.featureDistance ?? "cosine";

  if (!candidates || candidates.length === 0) {
    return { oodRate: 0, p95: trainStats?.p95 ?? 0 };
  }

  const p95 = trainStats?.p95 ?? 0;
  if (!trainStats || !trainStats.vectors || trainStats.vectors.length === 0) {
    return { oodRate: 0, p95 };
  }

  const distFn = featureDistance === "l2" ? l2Distance : cosineDistance;
  const mean = computeMeanVector(trainStats.vectors);

  let oodCount = 0;
  for (const candidate of candidates) {
    const dist = distFn(candidate, mean);
    if (dist > p95) {
      oodCount++;
    }
  }

  return { oodRate: oodCount / candidates.length, p95 };
}

/** @param {unknown} v @returns {number} */
function safeNum(v) {
  return Number.isFinite(v) ? /** @type {number} */ (v) : 0;
}
