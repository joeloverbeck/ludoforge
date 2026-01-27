import { validateGenomeDefinition } from "./serialization.js";

function getRandomIndex(length, rng) {
  if (length <= 0) {
    return -1;
  }
  if (rng) {
    return rng.nextInt(length);
  }
  return Math.floor(Math.random() * length);
}

function collectCompatibleTargets(definitionA, definitionB) {
  const targets = [];

  if (Array.isArray(definitionA?.state?.variables) && Array.isArray(definitionB?.state?.variables)) {
    targets.push({
      name: "state.variables",
      apply(definition, donor) {
        definition.state = {
          ...definition.state,
          variables: structuredClone(donor.state.variables),
        };
      },
    });
  }

  if (Array.isArray(definitionA?.actions) && Array.isArray(definitionB?.actions)) {
    targets.push({
      name: "actions",
      apply(definition, donor) {
        definition.actions = structuredClone(donor.actions);
      },
    });
  }

  return targets;
}

export const subtreeSwapCrossover = {
  name: "subtree-swap",
  crossover(parentA, parentB, rng) {
    const definitionA = parentA?.definition;
    const definitionB = parentB?.definition;
    if (!definitionA || !definitionB) {
      return null;
    }

    const targets = collectCompatibleTargets(definitionA, definitionB);
    if (targets.length === 0) {
      return null;
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return null;
    }

    const target = targets[targetIndex];
    const definition = structuredClone(definitionA);
    target.apply(definition, definitionB);

    const validation = validateGenomeDefinition(definition);
    if (!validation.valid) {
      return null;
    }

    return {
      ...parentA,
      definition,
    };
  },
};

export const defaultCrossoverOperators = [subtreeSwapCrossover];

export function crossoverGenome(parentA, parentB, options = {}) {
  const { operators = defaultCrossoverOperators, rng } = options;
  if (!Array.isArray(operators) || operators.length === 0) {
    return structuredClone(parentA);
  }
  const operatorIndex = getRandomIndex(operators.length, rng);
  const operator = operators[Math.max(0, operatorIndex)];
  if (!operator) {
    return structuredClone(parentA);
  }
  return operator.crossover(parentA, parentB, rng);
}
