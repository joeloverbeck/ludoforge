import { repairGenome } from "./repair.js";

function getRandomIndex(length, rng) {
  if (length <= 0) {
    return -1;
  }
  if (rng) {
    return rng.nextInt(length);
  }
  return Math.floor(Math.random() * length);
}

function collectVariableTargets(definition) {
  const targets = [];
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  variables.forEach((variable, index) => {
    targets.push({ container: variables, index, variable });
  });

  const tokenTypes = Array.isArray(definition?.state?.tokenTypes)
    ? definition.state.tokenTypes
    : [];
  tokenTypes.forEach((tokenType) => {
    const attributes = Array.isArray(tokenType?.attributes) ? tokenType.attributes : [];
    attributes.forEach((attribute, index) => {
      targets.push({ container: attributes, index, variable: attribute });
    });
  });

  return targets;
}

function tweakIntValue(value, min, max, rng) {
  if (typeof value !== "number" || typeof min !== "number" || typeof max !== "number") {
    return value;
  }
  if (min > max) {
    return value;
  }
  if (min === max) {
    return min;
  }

  let direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  if (value <= min) {
    direction = 1;
  } else if (value >= max) {
    direction = -1;
  }

  const nextValue = value + direction;
  if (nextValue < min) {
    return min;
  }
  if (nextValue > max) {
    return max;
  }
  return nextValue;
}

export const numericTweakMutation = {
  name: "numeric-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "int"
    );

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const min = variable?.type?.min;
    const max = variable?.type?.max;
    const nextValue = tweakIntValue(variable?.initial, min, max, rng);

    target.container[target.index] = {
      ...variable,
      initial: nextValue,
    };

    return { ...genome, definition };
  },
};

export const booleanToggleMutation = {
  name: "boolean-toggle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "bool"
    );

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const initial = variable?.initial;
    if (typeof initial !== "boolean") {
      return { ...genome, definition };
    }

    target.container[target.index] = {
      ...variable,
      initial: !initial,
    };

    return { ...genome, definition };
  },
};

export const defaultMutationOperators = [numericTweakMutation, booleanToggleMutation];

export function mutateGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng } = options;
  if (!Array.isArray(operators) || operators.length === 0) {
    return structuredClone(genome);
  }
  const operatorIndex = getRandomIndex(operators.length, rng);
  const operator = operators[Math.max(0, operatorIndex)];
  if (!operator) {
    return structuredClone(genome);
  }
  return operator.mutate(genome, rng);
}

export function mutateAndRepairGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, repairOperators } = options;
  const mutated = mutateGenome(genome, { operators, rng });
  return repairGenome(mutated, { operators: repairOperators, rng });
}
