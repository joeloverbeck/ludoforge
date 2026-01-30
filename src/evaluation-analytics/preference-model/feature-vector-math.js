/**
 * Pure vector arithmetic for preference model feature vectors.
 * Zero dependencies — all functions are stateless and side-effect-free.
 */

/**
 * Shallow-clone a feature vector (or return empty object for non-objects).
 * @param {Record<string, number> | null | undefined} vector
 * @returns {Record<string, number>}
 */
function cloneFeatureVector(vector) {
  return vector && typeof vector === "object" ? { ...vector } : {};
}

/**
 * Multiply every value in a feature vector by a scalar.
 * @param {Record<string, number> | null | undefined} vector
 * @param {number} scalar
 * @returns {Record<string, number>}
 */
function scaleFeatureVector(vector, scalar) {
  const result = {};
  for (const [key, value] of Object.entries(vector ?? {})) {
    result[key] = (Number.isFinite(value) ? value : 0) * scalar;
  }
  return result;
}

/**
 * Element-wise addition: base + delta (delta keys merged into base).
 * @param {Record<string, number>} base
 * @param {Record<string, number> | null | undefined} delta
 * @returns {Record<string, number>}
 */
function addFeatureVectors(base, delta) {
  const result = { ...base };
  for (const [key, value] of Object.entries(delta ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current + (Number.isFinite(value) ? value : 0);
  }
  return result;
}

/**
 * Element-wise subtraction: a - b (b keys merged into a).
 * @param {Record<string, number>} a
 * @param {Record<string, number> | null | undefined} b
 * @returns {Record<string, number>}
 */
function diffFeatureVectors(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current - (Number.isFinite(value) ? value : 0);
  }
  return result;
}

export { cloneFeatureVector, scaleFeatureVector, addFeatureVectors, diffFeatureVectors };
