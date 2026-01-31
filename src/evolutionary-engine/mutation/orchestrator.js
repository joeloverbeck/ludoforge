import { repairGenome } from "../repair.js";
import {
  DEFAULT_EVOLUTION_OPERATORS_CONFIG,
  filterOperatorsByEnabled,
} from "../operator-config.js";
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
import { actionCostTweakMutation } from "./operators/action-cost-tweak.js";
import { motifInjectMutation } from "./operators/motif-inject.js";
import { zoneAddMutation } from "./operators/zone-add.js";
import { tokenTypeAddMutation } from "./operators/token-type-add.js";
import { triggerAddMutation } from "./operators/trigger-add.js";
import { triggerRemoveMutation } from "./operators/trigger-remove.js";
import { triggerEditMutation } from "./operators/trigger-edit.js";
import { variableAddMutation } from "./operators/variable-add.js";
import { variableRemoveMutation } from "./operators/variable-remove.js";
import { variableScopeToggleMutation } from "./operators/variable-scope-toggle.js";
import { terminationAddMutation } from "./operators/termination-add.js";
import { terminationRemoveMutation } from "./operators/termination-remove.js";
import { terminationConditionMutateMutation } from "./operators/termination-condition-mutate.js";
import { schedulerSwapMutation } from "./operators/scheduler-swap.js";
import { schedulerParamTweakMutation } from "./operators/scheduler-param-tweak.js";
import { conditionalEffectInsertMutation } from "./operators/conditional-effect-insert.js";
import { turnOrderEffectInsertMutation } from "./operators/turn-order-effect-insert.js";
import { chooseEffectInsertMutation } from "./operators/choose-effect-insert.js";
import { actionCostAddMutation } from "./operators/action-cost-add.js";
import { actionCostRemoveMutation } from "./operators/action-cost-remove.js";
import { workerCountTweakMutation } from "./operators/worker-count-tweak.js";

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
  actionCostTweakMutation,
  actionCostAddMutation,
  actionCostRemoveMutation,
  motifInjectMutation,
  zoneAddMutation,
  tokenTypeAddMutation,
  triggerAddMutation,
  triggerRemoveMutation,
  triggerEditMutation,
  variableAddMutation,
  variableRemoveMutation,
  variableScopeToggleMutation,
  terminationAddMutation,
  terminationRemoveMutation,
  terminationConditionMutateMutation,
  schedulerSwapMutation,
  schedulerParamTweakMutation,
  conditionalEffectInsertMutation,
  turnOrderEffectInsertMutation,
  chooseEffectInsertMutation,
  workerCountTweakMutation,
];

export const defaultMutationOperators = filterOperatorsByEnabled(
  ALL_MUTATION_OPERATORS,
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.mutation?.enabled,
);

export function mutateGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, selector } = options;
  if (!selector || typeof selector.pick !== "function") {
    throw new Error("mutateGenome requires a selector with a pick(rng) method");
  }
  if (!Array.isArray(operators) || operators.length === 0) {
    return { genome: structuredClone(genome), operatorName: null };
  }
  const operatorName = selector.pick(rng);
  const operator = operators.find((candidate) => candidate.name === operatorName);
  if (!operator) {
    throw new Error(
      `Operator "${operatorName}" selected by weighted selector but not found in operators list`,
    );
  }
  return { genome: operator.mutate(genome, rng), operatorName };
}

export function mutateAndRepairGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, repairOperators, selector } = options;
  const mutated = mutateGenome(genome, { operators, rng, selector });
  const originalGenome = structuredClone(genome);

  const mutationResult = mutated ?? { genome: null, operatorName: null };
  const operatorName = mutationResult.operatorName ?? null;
  const mutatedGenome = mutationResult.genome ?? originalGenome;

  const isNoOp = JSON.stringify(mutatedGenome) === JSON.stringify(originalGenome);
  if (isNoOp) {
    return { genome: mutatedGenome, operatorName, outcome: "noOp" };
  }

  const repaired = repairGenome(mutatedGenome, { operators: repairOperators, rng });
  if (!repaired) {
    return { genome: null, operatorName, outcome: "repairFailed" };
  }
  return { genome: repaired, operatorName, outcome: "ok" };
}
