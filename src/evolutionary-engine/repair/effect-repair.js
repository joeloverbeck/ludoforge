import { normalizeArray, clampNumber } from "./utils.js";
import {
  collectVariableIds,
  collectTokenTypeIds,
  collectTokenAttributeIds,
  collectZoneIds,
  collectSpatialZoneNodes,
} from "./id-collectors.js";

const MAX_REPEAT_DEPTH = 2;
const VALID_FLAG_DURATIONS = ["action", "phase", "turn"];

/**
 * @typedef {{ variableIds: Set<string>, tokenTypeIds: Set<string>, tokenAttributeIds: Map<string, Set<string>>, zoneIds: Set<string> }} IdContext
 */

/**
 * @param {object} definition
 * @returns {IdContext}
 */
function buildIdContext(definition) {
  return {
    variableIds: collectVariableIds(definition),
    tokenTypeIds: collectTokenTypeIds(definition),
    tokenAttributeIds: collectTokenAttributeIds(definition),
    zoneIds: collectZoneIds(definition),
  };
}

/**
 * @param {object} effect
 * @param {object} definition
 * @param {number} depth
 * @param {IdContext} [idContext]
 * @returns {object | null}
 */
export function repairEffect(effect, definition, depth, idContext) {
  if (!effect || typeof effect !== "object") {
    return effect;
  }
  const { variableIds, tokenTypeIds, tokenAttributeIds, zoneIds } =
    idContext ?? buildIdContext(definition);
  let nextEffect = effect;

  if (effect.target && typeof effect.target === "object") {
    if (effect.target.kind === "var" && typeof effect.target.id === "string") {
      if (!variableIds.has(effect.target.id)) {
        const validVariables = [...variableIds];
        if (validVariables.length === 0) {
          return null;
        }
        nextEffect = {
          ...nextEffect,
          target: { ...effect.target, id: validVariables[0] },
        };
      }
    }

    if (effect.target.kind === "token" && effect.kind === "spawn") {
      if (typeof effect.target.id === "string" && !tokenTypeIds.has(effect.target.id)) {
        const validTokenTypes = [...tokenTypeIds];
        if (validTokenTypes.length === 0) {
          return null;
        }
        const replacementId = validTokenTypes[0];
        let nextTarget = { ...effect.target, id: replacementId };
        if (typeof nextTarget.attribute === "string") {
          const attributes = tokenAttributeIds.get(replacementId);
          if (!attributes || !attributes.has(nextTarget.attribute)) {
            const { attribute: _, ...rest } = nextTarget;
            nextTarget = rest;
          }
        }
        nextEffect = {
          ...nextEffect,
          target: nextTarget,
        };
      }
    }

    if (effect.target.kind === "zone" && typeof effect.target.id === "string") {
      if (!zoneIds.has(effect.target.id)) {
        const validZones = [...zoneIds];
        if (validZones.length === 0) {
          return null;
        }
        nextEffect = {
          ...nextEffect,
          target: { ...effect.target, id: validZones[0] },
        };
      }
    }
  }

  if ((effect.kind === "move" || effect.kind === "spawn" || effect.kind === "queue_push") && effect.toZone) {
    if (!zoneIds.has(effect.toZone)) {
      const validZones = [...zoneIds];
      if (validZones.length === 0) {
        return null;
      }
      nextEffect = { ...nextEffect, toZone: validZones[0] };
    }
  }

  if (effect.kind === "queue_pop" && effect.fromZone) {
    if (!zoneIds.has(effect.fromZone)) {
      const validZones = [...zoneIds];
      if (validZones.length === 0) {
        return null;
      }
      nextEffect = { ...nextEffect, fromZone: validZones[0] };
    }
  }

  if (effect.kind === "shuffle" && effect.target && effect.target.kind === "zone") {
    if (!zoneIds.has(effect.target.id)) {
      const validZones = [...zoneIds];
      if (validZones.length === 0) {
        return null;
      }
      nextEffect = { ...nextEffect, target: { ...effect.target, id: validZones[0] } };
    }
  }

  if (effect.kind === "move_spatial") {
    const spatialMap = collectSpatialZoneNodes(definition);
    if (effect.zone && !spatialMap.has(effect.zone)) {
      const validSpatial = [...spatialMap.keys()];
      if (validSpatial.length === 0) {
        return null;
      }
      const newZone = validSpatial[0];
      const nodes = [...spatialMap.get(newZone)];
      nextEffect = { ...nextEffect, zone: newZone, toNode: nodes[0] ?? effect.toNode };
    } else if (effect.zone && spatialMap.has(effect.zone)) {
      const nodes = spatialMap.get(effect.zone);
      if (effect.toNode && !nodes.has(effect.toNode)) {
        nextEffect = { ...nextEffect, toNode: [...nodes][0] };
      }
    }
  }

  if (effect.kind === "repeat") {
    if (depth >= MAX_REPEAT_DEPTH) {
      return null;
    }
    const count = typeof effect.count === "number"
      ? clampNumber(effect.count, 1, 10)
      : 1;
    const ctx = idContext ?? buildIdContext(definition);
    const subEffects = normalizeArray(effect.effects)
      .map((e) => repairEffect(e, definition, depth + 1, ctx))
      .filter(Boolean);
    if (subEffects.length === 0) {
      return null;
    }
    return { ...nextEffect, count, effects: subEffects };
  }

  if (effect.kind === "set_flag") {
    if (effect.duration && !VALID_FLAG_DURATIONS.includes(effect.duration)) {
      return { ...nextEffect, duration: "action" };
    }
  }

  return nextEffect;
}

/**
 * @param {Array} effects
 * @param {object} definition
 * @returns {Array}
 */
export function repairEffects(effects, definition) {
  const idContext = buildIdContext(definition);
  return normalizeArray(effects)
    .map((e) => repairEffect(e, definition, 0, idContext))
    .filter(Boolean);
}
