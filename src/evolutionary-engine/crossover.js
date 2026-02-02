import {
  DEFAULT_EVOLUTION_OPERATORS_CONFIG,
  filterOperatorsByEnabled,
} from "./operator-config.js";
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
    process.stderr.write(`[crossover] clone start target=${target.name}\n`);
    const definition = structuredClone(definitionA);
    process.stderr.write(`[crossover] clone done, applying\n`);
    target.apply(definition, definitionB);
    process.stderr.write(`[crossover] apply done, validating\n`);

    const validation = validateGenomeDefinition(definition);
    process.stderr.write(`[crossover] validation done valid=${validation.valid}\n`);
    if (!validation.valid) {
      return null;
    }

    return {
      ...parentA,
      definition,
    };
  },
};

const ALL_CROSSOVER_OPERATORS = [subtreeSwapCrossover];

export const defaultCrossoverOperators = filterOperatorsByEnabled(
  ALL_CROSSOVER_OPERATORS,
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.crossover?.enabled,
);

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
  process.stderr.write(`[crossover] calling operator=${operator.name} parentA=${parentA?.id ?? "?"} parentB=${parentB?.id ?? "?"}\n`);
  const result = operator.crossover(parentA, parentB, rng);
  process.stderr.write(`[crossover] operator=${operator.name} returned ${result ? "genome" : "null"}\n`);
  return result;
}
