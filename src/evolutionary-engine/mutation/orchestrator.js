import { repairGenome } from "../repair.js";
import {
  DEFAULT_EVOLUTION_OPERATORS_CONFIG,
  filterOperatorsByEnabled,
} from "../operator-config.js";
import { getRandomIndex } from "./random.js";
import { numericTweakMutation } from "./operators/numeric-tweak.js";
import { booleanToggleMutation } from "./operators/boolean-toggle.js";
import { enumCycleMutation } from "./operators/enum-cycle.js";
import { actionDuplicateMutation } from "./operators/action-duplicate.js";
import { actionRemoveMutation } from "./operators/action-remove.js";
import { actionEffectMagnitudeMutation } from "./operators/action-effect-magnitude.js";
import { preconditionNegationMutation } from "./operators/precondition-negation.js";
import { terminationThresholdMutation } from "./operators/termination-threshold.js";
import { terminationOutcomeMutation } from "./operators/termination-outcome.js";
import { phaseAddMutation } from "./operators/phase-add.js";
import { phaseRemoveMutation } from "./operators/phase-remove.js";
import { tokenTypeZoneTargetAddMutation } from "./operators/token-zone-target-add.js";
import { tokenTypeRemoveMutation } from "./operators/token-type-remove.js";
import { zoneRemoveMutation } from "./operators/zone-remove.js";

const ALL_MUTATION_OPERATORS = [
  numericTweakMutation,
  booleanToggleMutation,
  enumCycleMutation,
  actionDuplicateMutation,
  actionRemoveMutation,
  actionEffectMagnitudeMutation,
  preconditionNegationMutation,
  terminationThresholdMutation,
  terminationOutcomeMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  tokenTypeZoneTargetAddMutation,
  tokenTypeRemoveMutation,
  zoneRemoveMutation,
];

export const defaultMutationOperators = filterOperatorsByEnabled(
  ALL_MUTATION_OPERATORS,
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.enabled,
);

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
