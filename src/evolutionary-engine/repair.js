function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampNumber(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function repairVariable(variable) {
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

function repairVariables(variables) {
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

function repairTokenTypes(tokenTypes) {
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

export const dslSafetyRepair = {
  name: "dsl-safety",
  repair(genome) {
    const definition = structuredClone(genome.definition);
    const state = definition.state ?? {};

    const variables = repairVariables(state.variables);
    if (!variables) {
      return null;
    }

    const tokenTypes = state.tokenTypes ? repairTokenTypes(state.tokenTypes) : null;
    if (state.tokenTypes && !tokenTypes) {
      return null;
    }

    definition.state = {
      ...state,
      variables,
      ...(tokenTypes ? { tokenTypes } : {}),
    };

    return {
      ...genome,
      definition,
    };
  },
};

export const defaultRepairOperators = [dslSafetyRepair];

export function repairGenome(genome, options = {}) {
  const { operators = defaultRepairOperators, rng } = options;
  if (!Array.isArray(operators) || operators.length === 0) {
    return structuredClone(genome);
  }

  let current = structuredClone(genome);
  for (const operator of operators) {
    const next = operator.repair(current, rng);
    if (!next) {
      return null;
    }
    current = next;
  }

  return current;
}
