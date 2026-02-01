import { normalizeArray } from "./issue-collector.js";

/**
 * Collect all token target ids referenced in an effect tree.
 * @param {object} effect
 * @param {Set<string>} refs
 */
function collectTokenRefs(effect, refs) {
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
    collectTokenRefs(sub, refs);
  }
  for (const sub of normalizeArray(effect.then)) {
    collectTokenRefs(sub, refs);
  }
  for (const sub of normalizeArray(effect.else)) {
    collectTokenRefs(sub, refs);
  }
  if (Array.isArray(effect.options)) {
    for (const optionEffects of effect.options) {
      for (const sub of normalizeArray(optionEffects)) {
        collectTokenRefs(sub, refs);
      }
    }
  }
}

/**
 * Detect action params that are never referenced in effects.
 * @param {Array} actions
 * @param {Function} pushIssue
 */
export function detectUnusedParams(actions, pushIssue) {
  if (!Array.isArray(actions)) {
    return;
  }

  actions.forEach((action, actionIndex) => {
    if (!action || typeof action !== "object") {
      return;
    }
    const params = normalizeArray(action.params);
    if (params.length === 0) {
      return;
    }

    const refs = new Set();
    for (const effect of normalizeArray(action.effects)) {
      collectTokenRefs(effect, refs);
    }
    for (const cost of normalizeArray(action.costs)) {
      collectTokenRefs(cost, refs);
    }

    const paramIds = new Set(
      params.map((p) => p?.id).filter((id) => typeof id === "string")
    );

    for (const paramId of paramIds) {
      if (!refs.has(paramId)) {
        pushIssue(
          `/actions/${actionIndex}/params`,
          `Action "${action.id ?? actionIndex}" declares param "${paramId}" but never references it in effects`,
          "unused-action-param"
        );
      }
    }
  });
}
