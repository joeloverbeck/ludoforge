import { normalizeArray } from "./utils.js";
import { collectVariableIds } from "./id-collectors.js";
import { repairEffects } from "./effect-repair.js";
import { exprReferencesMissingVariable } from "./expression-repair.js";
import { evaluateExpr } from "../../dsl/semantic/expr-evaluator.js";
import { buildExprEvalContext } from "./expr-eval-context.js";

/**
 * Collect all token target ids referenced in an effect tree.
 * @param {object} effect
 * @param {Set<string>} refs
 */
function collectTokenRefsFromEffect(effect, refs) {
  if (!effect || typeof effect !== "object") {
    return;
  }
  if (effect.target?.kind === "token" && typeof effect.target.id === "string") {
    refs.add(effect.target.id);
  }
  if (effect.selector?.tokenType) {
    refs.add(effect.selector.tokenType);
  }
  for (const sub of normalizeArray(effect.effects)) {
    collectTokenRefsFromEffect(sub, refs);
  }
  for (const sub of normalizeArray(effect.then)) {
    collectTokenRefsFromEffect(sub, refs);
  }
  for (const sub of normalizeArray(effect.else)) {
    collectTokenRefsFromEffect(sub, refs);
  }
  if (Array.isArray(effect.options)) {
    for (const optionEffects of effect.options) {
      for (const sub of normalizeArray(optionEffects)) {
        collectTokenRefsFromEffect(sub, refs);
      }
    }
  }
}

/**
 * Strip unused params from an action.
 * @param {object} action
 * @returns {object}
 */
function stripUnusedParams(action) {
  const params = normalizeArray(action.params);
  if (params.length === 0) {
    return action;
  }
  const refs = new Set();
  for (const effect of normalizeArray(action.effects)) {
    collectTokenRefsFromEffect(effect, refs);
  }
  for (const cost of normalizeArray(action.costs)) {
    collectTokenRefsFromEffect(cost, refs);
  }
  const usedParams = params.filter(
    (p) => typeof p?.id === "string" && refs.has(p.id)
  );
  if (usedParams.length === params.length) {
    return action;
  }
  if (usedParams.length === 0) {
    const { params: _, ...rest } = action;
    return rest;
  }
  return { ...action, params: usedParams };
}

/**
 * @param {object} definition
 * @returns {Array}
 */
export function repairActions(definition) {
  const variableIds = collectVariableIds(definition);
  const exprEvalContext = buildExprEvalContext(definition);
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
    if (nextAction.preconditions) {
      const result = evaluateExpr(nextAction.preconditions, exprEvalContext);
      if (result.possible === false) {
        const { preconditions: _, ...rest } = nextAction;
        return rest;
      }
    }
    return stripUnusedParams(nextAction);
  });
}

/**
 * @param {object} definition
 * @returns {Array}
 */
export function repairTriggers(definition) {
  const variableIds = collectVariableIds(definition);
  const triggers = normalizeArray(definition.triggers);
  return triggers.map((trigger) => {
    if (!trigger || typeof trigger !== "object") {
      return trigger;
    }
    const effects = repairEffects(trigger.effects, definition);
    const nextTrigger = { ...trigger, effects };
    if (trigger.condition && exprReferencesMissingVariable(trigger.condition, variableIds)) {
      const { condition: _, ...rest } = nextTrigger;
      return rest;
    }
    return nextTrigger;
  });
}
