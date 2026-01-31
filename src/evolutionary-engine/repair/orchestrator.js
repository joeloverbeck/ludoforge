import {
  DEFAULT_EVOLUTION_OPERATORS_CONFIG,
  filterOperatorsByEnabled,
} from "../operator-config.js";
import { normalizeArray } from "./utils.js";
import { repairVariables, repairTokenTypes } from "./variable-repair.js";
import { repairActions, repairTriggers } from "./action-repair.js";
import { repairEffects } from "./effect-repair.js";
import { hasZoneReferencingEffects } from "./effect-queries.js";
import { repairTerminationOutcomes } from "./termination-repair.js";

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

    definition.actions = repairActions(definition);
    if (definition.triggers) {
      definition.triggers = repairTriggers(definition);
    }

    if (definition.turn?.stepEffects) {
      definition.turn = {
        ...definition.turn,
        stepEffects: definition.turn.stepEffects.map((se) => {
          if (!se || typeof se !== "object") {
            return se;
          }
          return { ...se, effects: repairEffects(se.effects, definition) };
        }),
      };
    }

    const repairedDefinition = repairTerminationOutcomes(definition);

    const actions = normalizeArray(repairedDefinition.actions);
    if (actions.length === 0) {
      return null;
    }

    const hasActionWithEffects = actions.some(
      (action) => Array.isArray(action?.effects) && action.effects.length > 0
    );
    if (!hasActionWithEffects) {
      return null;
    }

    const conditions = normalizeArray(repairedDefinition?.termination?.conditions);
    if (conditions.length === 0) {
      return null;
    }

    const zones = normalizeArray(repairedDefinition?.state?.zones);
    if (zones.length === 0 && hasZoneReferencingEffects(repairedDefinition)) {
      return null;
    }

    return {
      ...genome,
      definition: repairedDefinition,
    };
  },
};

const ALL_REPAIR_OPERATORS = [dslSafetyRepair];

export const defaultRepairOperators = filterOperatorsByEnabled(
  ALL_REPAIR_OPERATORS,
  DEFAULT_EVOLUTION_OPERATORS_CONFIG.repair?.enabled,
);

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
