import { normalizeArray } from "./utils.js";
import { collectVariableIds } from "./id-collectors.js";
import { repairEffects } from "./effect-repair.js";
import { exprReferencesMissingVariable } from "./expression-repair.js";

/**
 * @param {object} definition
 * @returns {Array}
 */
export function repairActions(definition) {
  const variableIds = collectVariableIds(definition);
  const actions = normalizeArray(definition.actions);
  return actions.map((action) => {
    if (!action || typeof action !== "object") {
      return action;
    }
    const costs = repairEffects(action.costs, definition);
    const effects = repairEffects(action.effects, definition);
    const nextAction = { ...action, costs, effects };
    if (action.preconditions && exprReferencesMissingVariable(action.preconditions, variableIds)) {
      const { preconditions: _, ...rest } = nextAction;
      return rest;
    }
    return nextAction;
  });
}

/**
 * @param {object} definition
 * @returns {Array}
 */
export function repairTriggers(definition) {
  const triggers = normalizeArray(definition.triggers);
  return triggers.map((trigger) => {
    if (!trigger || typeof trigger !== "object") {
      return trigger;
    }
    const effects = repairEffects(trigger.effects, definition);
    return { ...trigger, effects };
  });
}
