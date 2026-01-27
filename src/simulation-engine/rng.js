const UINT32_MAX_PLUS_ONE = 2 ** 32;
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;

function normalizeSeed(seed) {
  if (!Number.isInteger(seed)) {
    throw new Error("Seed must be an integer.");
  }
  if (seed < 0 || seed >= UINT32_MAX_PLUS_ONE) {
    throw new Error("Seed must be a 32-bit unsigned integer.");
  }
  return seed >>> 0;
}

export function createSeededRng(seed) {
  let state = normalizeSeed(seed);

  function nextUint32() {
    state = (LCG_MULTIPLIER * state + LCG_INCREMENT) >>> 0;
    return state;
  }

  return {
    next() {
      return nextUint32() / UINT32_MAX_PLUS_ONE;
    },
    nextInt(max) {
      if (!Number.isInteger(max) || max <= 0) {
        throw new Error("max must be a positive integer.");
      }
      return Math.floor(this.next() * max);
    },
  };
}
