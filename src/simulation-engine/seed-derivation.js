/**
 * Deterministic seed derivation utility.
 * Hashes a base seed with arbitrary string/number components into a
 * deterministic uint32 using FNV-1a.
 *
 * @param {number} baseSeed
 * @param {...(string|number)} components
 * @returns {number} non-negative 32-bit integer
 */
function deriveSeed(baseSeed, ...components) {
  let hash = 2166136261 >>> 0;

  const baseBytes = numberToBytes(baseSeed >>> 0);
  for (const byte of baseBytes) {
    hash = fnvStep(hash, byte);
  }

  for (const component of components) {
    if (typeof component === "number") {
      const bytes = numberToBytes(component >>> 0);
      for (const byte of bytes) {
        hash = fnvStep(hash, byte);
      }
    } else {
      const str = String(component);
      for (let i = 0; i < str.length; i += 1) {
        hash = fnvStep(hash, str.charCodeAt(i) & 0xff);
        hash = fnvStep(hash, (str.charCodeAt(i) >>> 8) & 0xff);
      }
    }
  }

  return hash >>> 0;
}

function fnvStep(hash, byte) {
  return (Math.imul(hash ^ byte, 16777619)) >>> 0;
}

function numberToBytes(value) {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

export { deriveSeed };
