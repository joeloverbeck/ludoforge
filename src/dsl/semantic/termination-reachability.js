import { normalizeArray } from "./issue-collector.js";

/**
 * Collect all variable ids targeted by set/inc/dec effects across actions, triggers, step-effects.
 * @param {object} definition
 * @returns {Set<string>}
 */
function collectModifiedVariableIds(definition) {
  const modified = new Set();

  function walkEffect(effect) {
    if (!effect || typeof effect !== "object") {
      return;
    }
    if (
      (effect.kind === "set" || effect.kind === "inc" || effect.kind === "dec") &&
      effect.target?.kind === "var" &&
      typeof effect.target.id === "string"
    ) {
      modified.add(effect.target.id);
    }
    for (const sub of normalizeArray(effect.effects)) {
      walkEffect(sub);
    }
    for (const sub of normalizeArray(effect.then)) {
      walkEffect(sub);
    }
    for (const sub of normalizeArray(effect.else)) {
      walkEffect(sub);
    }
    if (Array.isArray(effect.options)) {
      for (const optionEffects of effect.options) {
        for (const sub of normalizeArray(optionEffects)) {
          walkEffect(sub);
        }
      }
    }
  }

  for (const action of normalizeArray(definition.actions)) {
    for (const effect of normalizeArray(action?.effects)) {
      walkEffect(effect);
    }
    for (const cost of normalizeArray(action?.costs)) {
      walkEffect(cost);
    }
  }

  for (const trigger of normalizeArray(definition.triggers)) {
    for (const effect of normalizeArray(trigger?.effects)) {
      walkEffect(effect);
    }
  }

  for (const stepEffect of normalizeArray(definition.turn?.stepEffects)) {
    for (const effect of normalizeArray(stepEffect?.effects)) {
      walkEffect(effect);
    }
  }

  return modified;
}

/**
 * Detect termination conditions that reference variables never modified by any effect.
 * @param {Array} conditions
 * @param {object} definition
 * @param {Function} pushIssue
 */
export function detectUnreachableTerminations(conditions, definition, pushIssue) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return;
  }

  const modifiedVarIds = collectModifiedVariableIds(definition);

  conditions.forEach((entry, index) => {
    if (!entry?.condition || entry.condition.kind !== "cmp") {
      return;
    }
    const cond = entry.condition;
    const varId =
      cond.left?.kind === "ref" && cond.left.ref?.kind === "var" && typeof cond.left.ref.id === "string"
        ? cond.left.ref.id
        : null;
    if (!varId) {
      return;
    }
    if (!modifiedVarIds.has(varId)) {
      pushIssue(
        `/termination/conditions/${index}`,
        `Termination condition references variable "${varId}" which is never modified by any effect`,
        "termination-variable-unmodified"
      );
    }
  });
}
