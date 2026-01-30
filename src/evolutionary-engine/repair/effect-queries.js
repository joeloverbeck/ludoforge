import { normalizeArray } from "./utils.js";

/**
 * @param {object} effect
 * @returns {boolean}
 */
export function effectReferencesZone(effect) {
  if (!effect || typeof effect !== "object") {
    return false;
  }
  if ((effect.kind === "move" || effect.kind === "spawn") && typeof effect.toZone === "string") {
    return true;
  }
  if (effect.kind === "move_spatial" && typeof effect.zone === "string") {
    return true;
  }
  if (effect.kind === "repeat") {
    return normalizeArray(effect.effects).some((child) => effectReferencesZone(child));
  }
  return false;
}

/**
 * @param {object} definition
 * @returns {boolean}
 */
export function hasZoneReferencingEffects(definition) {
  const actions = normalizeArray(definition?.actions);
  for (const action of actions) {
    if (normalizeArray(action?.effects).some((effect) => effectReferencesZone(effect))) {
      return true;
    }
    if (normalizeArray(action?.costs).some((effect) => effectReferencesZone(effect))) {
      return true;
    }
  }
  const triggers = normalizeArray(definition?.triggers);
  for (const trigger of triggers) {
    if (normalizeArray(trigger?.effects).some((effect) => effectReferencesZone(effect))) {
      return true;
    }
  }
  const stepEffects = normalizeArray(definition?.turn?.stepEffects);
  if (stepEffects.some((effect) => effectReferencesZone(effect))) {
    return true;
  }
  return false;
}
