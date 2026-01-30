import { normalizeArray, clampNumber } from "./utils.js";

/**
 * @param {object} variable
 * @returns {object | null}
 */
export function repairVariable(variable) {
  if (!variable || typeof variable !== "object") {
    return null;
  }
  const type = variable.type;
  if (!type || typeof type !== "object") {
    return null;
  }

  if (type.kind === "int") {
    const min = type.min;
    const max = type.max;
    if (typeof min !== "number" || typeof max !== "number" || min > max) {
      return null;
    }
    const initialValue = typeof variable.initial === "number" ? variable.initial : min;
    return {
      ...variable,
      initial: clampNumber(initialValue, min, max),
    };
  }

  if (type.kind === "bool") {
    const initialValue = typeof variable.initial === "boolean" ? variable.initial : false;
    return {
      ...variable,
      initial: initialValue,
    };
  }

  if (type.kind === "enum") {
    const values = Array.isArray(type.values) ? type.values.filter((value) => typeof value === "string") : [];
    if (values.length === 0) {
      return null;
    }
    const initialValue =
      typeof variable.initial === "string" && values.includes(variable.initial)
        ? variable.initial
        : values[0];
    return {
      ...variable,
      initial: initialValue,
    };
  }

  return null;
}

/**
 * @param {Array} variables
 * @returns {Array | null}
 */
export function repairVariables(variables) {
  const repaired = [];
  for (const variable of normalizeArray(variables)) {
    const next = repairVariable(variable);
    if (!next) {
      return null;
    }
    repaired.push(next);
  }
  return repaired;
}

/**
 * @param {Array} tokenTypes
 * @returns {Array | null}
 */
export function repairTokenTypes(tokenTypes) {
  const repaired = [];
  for (const tokenType of normalizeArray(tokenTypes)) {
    const attributes = repairVariables(tokenType?.attributes);
    if (!attributes) {
      return null;
    }
    repaired.push({
      ...tokenType,
      attributes,
    });
  }
  return repaired;
}
