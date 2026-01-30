/**
 * @param {unknown} value
 * @returns {Array}
 */
export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampNumber(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
