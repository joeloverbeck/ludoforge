// --- RNG helpers ---

/**
 * @param {{ next(): number }} rng
 * @param {number} min
 * @param {number} max
 * @returns {number} inclusive random integer in [min, max]
 */
export function pickInt(rng, min, max) {
  return min + Math.floor(rng.next() * (max - min + 1));
}

/**
 * @param {{ next(): number }} rng
 * @param {Record<string, number>} weights
 * @returns {string} randomly selected key proportional to weights
 */
export function pickWeighted(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) {
      return key;
    }
  }
  return entries[entries.length - 1][0];
}

/**
 * @param {{ next(): number }} rng
 * @param {Array} array
 * @returns {*} random element from array
 */
export function pickFrom(rng, array) {
  return array[Math.floor(rng.next() * array.length)];
}

// --- DSL node builders (pure, no RNG) ---

/** @param {string} id */
export function varRef(id) {
  return { kind: "var", id };
}

/** @param {number | boolean | string} value */
export function valueExpr(value) {
  return { kind: "value", value };
}

/**
 * @param {{ kind: string, id: string }} ref
 */
export function refExpr(ref) {
  return { kind: "ref", ref };
}

/**
 * @param {string} op
 * @param {object} left
 * @param {object} right
 */
export function cmpExpr(op, left, right) {
  return { kind: "cmp", op, left, right };
}

/**
 * @param {string} varId
 * @param {number} amount
 */
export function incEffect(varId, amount) {
  return { kind: "inc", target: varRef(varId), amount };
}

/**
 * @param {string} varId
 * @param {number} amount
 */
export function decEffect(varId, amount) {
  return { kind: "dec", target: varRef(varId), amount };
}

/**
 * @param {string} varId
 * @param {number | boolean | string} value
 */
export function setEffect(varId, value) {
  return { kind: "set", target: varRef(varId), value };
}

// --- Compound builders ---

/**
 * @param {{ rng: { next(): number }, id: string }} opts
 */
export function generateIntVariable({ rng, id }) {
  const max = pickInt(rng, 2, 20);
  return {
    id,
    scope: "global",
    type: { kind: "int", min: 0, max },
    initial: 0,
  };
}

/**
 * @param {{ rng: { next(): number }, kind: string, variableId: string, variableDef: object }} opts
 */
export function generateEffect({ rng, kind, variableId, variableDef }) {
  switch (kind) {
    case "inc":
      return incEffect(variableId, pickInt(rng, 1, 3));
    case "dec":
      return decEffect(variableId, pickInt(rng, 1, 3));
    case "set": {
      const val = pickInt(rng, variableDef.type.min, variableDef.type.max);
      return setEffect(variableId, val);
    }
    default:
      return incEffect(variableId, 1);
  }
}

/**
 * @param {{ variableId: string, variableDef: object }} opts
 */
export function generatePrecondition({ variableId, variableDef }) {
  return cmpExpr(
    "<",
    refExpr(varRef(variableId)),
    valueExpr(variableDef.type.max)
  );
}

/**
 * @param {{ variableId: string, variableDef: object }} opts
 */
export function generateTerminationCondition({ variableId, variableDef }) {
  return {
    condition: cmpExpr(
      ">=",
      refExpr(varRef(variableId)),
      valueExpr(variableDef.type.max)
    ),
    outcome: { type: "win", players: "active" },
  };
}
