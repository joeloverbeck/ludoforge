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
import { effectInsertMutation } from "./operators/effect-insert.js";
import { effectDeleteMutation } from "./operators/effect-delete.js";
import { effectParamTweakMutation } from "./operators/effect-param-tweak.js";
import { effectKindSwapMutation } from "./operators/effect-kind-swap.js";
import { effectReorderMutation } from "./operators/effect-reorder.js";
import { actionAddSmallMutation } from "./operators/action-add-small.js";
import { motifInjectMutation } from "./operators/motif-inject.js";
import { zoneAddMutation } from "./operators/zone-add.js";
import { tokenTypeAddMutation } from "./operators/token-type-add.js";
import { triggerAddMutation } from "./operators/trigger-add.js";
import { schedulerSwapMutation } from "./operators/scheduler-swap.js";
import { schedulerParamTweakMutation } from "./operators/scheduler-param-tweak.js";

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
  effectInsertMutation,
  effectDeleteMutation,
  effectParamTweakMutation,
  effectKindSwapMutation,
  effectReorderMutation,
  actionAddSmallMutation,
  motifInjectMutation,
  zoneAddMutation,
  tokenTypeAddMutation,
  triggerAddMutation,
  schedulerSwapMutation,
  schedulerParamTweakMutation,
];

export const defaultMutationOperators = filterOperatorsByEnabled(
  ALL_MUTATION_OPERATORS,
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.enabled,
);

export function mutateGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, selector } = options;
  if (!Array.isArray(operators) || operators.length === 0) {
    const cloned = structuredClone(genome);
    if (selector) {
      return { genome: cloned, operatorName: null };
    }
    return cloned;
  }
  if (selector && typeof selector.pick === "function") {
    const operatorName = selector.pick(rng);
    const operator = operators.find((candidate) => candidate.name === operatorName);
    if (!operator) {
      return { genome: structuredClone(genome), operatorName };
    }
    return { genome: operator.mutate(genome, rng), operatorName };
  }
  const operatorIndex = getRandomIndex(operators.length, rng);
  const operator = operators[Math.max(0, operatorIndex)];
  if (!operator) {
    return structuredClone(genome);
  }
  return operator.mutate(genome, rng);
}

export function mutateAndRepairGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, repairOperators, selector } = options;
  const mutated = mutateGenome(genome, { operators, rng, selector });
  const originalGenome = structuredClone(genome);

  if (selector) {
    const mutationResult = mutated ?? { genome: null, operatorName: null };
    const mutatedGenome = mutationResult.genome ?? originalGenome;
    const repaired = repairGenome(mutatedGenome, { operators: repairOperators, rng });
    if (!repaired) {
      return { genome: originalGenome, operatorName: null };
    }
    return { genome: repaired, operatorName: mutationResult.operatorName ?? null };
  }

  const repaired = repairGenome(mutated, { operators: repairOperators, rng });
  if (!repaired) {
    return originalGenome;
  }
  return repaired;
}
