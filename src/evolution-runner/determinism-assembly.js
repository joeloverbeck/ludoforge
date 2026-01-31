/**
 * Assembles determinism metadata for generation artifacts.
 *
 * @param {object|undefined} explicitDeterminism - User-supplied determinism object
 * @param {object|null} rng - Seeded RNG instance (or null)
 * @param {number|undefined} seed - Numeric seed value
 * @returns {object|undefined} Determinism metadata, or undefined when not applicable
 */
export function assembleDeterminism(explicitDeterminism, rng, seed) {
  if (explicitDeterminism) {
    return explicitDeterminism;
  }
  if (!rng) {
    return undefined;
  }
  if (Number.isFinite(seed)) {
    return { seed };
  }
  return undefined;
}
