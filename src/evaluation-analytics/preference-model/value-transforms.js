/**
 * Normalization and clamping utilities for preference model values.
 * Zero dependencies — all functions are stateless and side-effect-free.
 */

/**
 * Clamp a value to [-limit, +limit]. Non-finite values become 0.
 * @param {number} value
 * @param {number} limit
 * @returns {number}
 */
function clampAbs(value, limit) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const absLimit = Math.abs(Number.isFinite(limit) ? limit : 0);
  if (absLimit === 0) {
    return 0;
  }
  if (value >= absLimit) {
    return absLimit;
  }
  if (value <= -absLimit) {
    return -absLimit;
  }
  return value;
}

/**
 * Normalize a rating into [-1, +1] centered range.
 * Ratings in [1,5] are linearly mapped; ratings already in [-1,1] pass through.
 * @param {number} rating
 * @returns {number}
 */
function normalizeRatingTargetCentered(rating) {
  if (!Number.isFinite(rating)) {
    return 0;
  }
  if (rating >= 1 && rating <= 5) {
    return ((rating - 1) / 4) * 2 - 1;
  }
  if (rating >= -1 && rating <= 1) {
    return rating;
  }
  return rating;
}

/**
 * Truncate a history array to at most maxHistory entries (keeping the most recent).
 * @param {Array} history
 * @param {number} maxHistory
 * @returns {Array}
 */
function clampHistory(history, maxHistory) {
  if (maxHistory <= 0) {
    return [];
  }
  if (history.length <= maxHistory) {
    return history;
  }
  return history.slice(history.length - maxHistory);
}

/**
 * Map a comparison preference string to a numeric target.
 * "a" → 1, "b" → 0, anything else → 0.5 (tie).
 * @param {string} preferred
 * @returns {number}
 */
function normalizeComparisonTarget(preferred) {
  if (preferred === "a") {
    return 1;
  }
  if (preferred === "b") {
    return 0;
  }
  return 0.5;
}

export { clampAbs, normalizeRatingTargetCentered, clampHistory, normalizeComparisonTarget };
