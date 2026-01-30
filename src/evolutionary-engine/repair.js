import {
  DEFAULT_EVOLUTION_OPERATORS_CONFIG,
  filterOperatorsByEnabled,
} from "./operator-config.js";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampNumber(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function repairVariable(variable) {
  if (!variable || typeof variable !== "object") {
    return null;
  }
  const type = variable.type;
  if (!type || typeof type !== "object") {
    return null;
  }

  if (type.kind === "int") {
    const min = type.min;
    const max = type.max;
    if (typeof min !== "number" || typeof max !== "number" || min > max) {
      return null;
    }
    const initialValue = typeof variable.initial === "number" ? variable.initial : min;
    return {
      ...variable,
      initial: clampNumber(initialValue, min, max),
    };
  }

  if (type.kind === "bool") {
    const initialValue = typeof variable.initial === "boolean" ? variable.initial : false;
    return {
      ...variable,
      initial: initialValue,
    };
  }

  if (type.kind === "enum") {
    const values = Array.isArray(type.values) ? type.values.filter((value) => typeof value === "string") : [];
    if (values.length === 0) {
      return null;
    }
    const initialValue =
      typeof variable.initial === "string" && values.includes(variable.initial)
        ? variable.initial
        : values[0];
    return {
      ...variable,
      initial: initialValue,
    };
  }

  return null;
}

function repairVariables(variables) {
  const repaired = [];
  for (const variable of normalizeArray(variables)) {
    const next = repairVariable(variable);
    if (!next) {
      return null;
    }
    repaired.push(next);
  }
  return repaired;
}

function repairTokenTypes(tokenTypes) {
  const repaired = [];
  for (const tokenType of normalizeArray(tokenTypes)) {
    const attributes = repairVariables(tokenType?.attributes);
    if (!attributes) {
      return null;
    }
    repaired.push({
      ...tokenType,
      attributes,
    });
  }
  return repaired;
}

function collectZoneIds(definition) {
  const zones = normalizeArray(definition?.state?.zones);
  return new Set(zones.map((z) => z?.id).filter((id) => typeof id === "string"));
}

function collectSpatialZoneNodes(definition) {
  const zones = normalizeArray(definition?.state?.zones);
  const map = new Map();
  for (const zone of zones) {
    if (zone?.spatial?.nodes?.length > 0) {
      map.set(zone.id, new Set(zone.spatial.nodes));
    }
  }
  return map;
}

function repairEffect(effect, definition, depth) {
  if (!effect || typeof effect !== "object") {
    return effect;
  }
  const zoneIds = collectZoneIds(definition);

  if ((effect.kind === "move" || effect.kind === "spawn") && effect.toZone) {
    if (!zoneIds.has(effect.toZone)) {
      const validZones = [...zoneIds];
      if (validZones.length > 0) {
        return { ...effect, toZone: validZones[0] };
      }
    }
  }

  if (effect.kind === "move_spatial") {
    const spatialMap = collectSpatialZoneNodes(definition);
    if (effect.zone && !spatialMap.has(effect.zone)) {
      const validSpatial = [...spatialMap.keys()];
      if (validSpatial.length > 0) {
        const newZone = validSpatial[0];
        const nodes = [...spatialMap.get(newZone)];
        return { ...effect, zone: newZone, toNode: nodes[0] ?? effect.toNode };
      }
    } else if (effect.zone && spatialMap.has(effect.zone)) {
      const nodes = spatialMap.get(effect.zone);
      if (effect.toNode && !nodes.has(effect.toNode)) {
        return { ...effect, toNode: [...nodes][0] };
      }
    }
  }

  if (effect.kind === "repeat") {
    const maxDepth = 2;
    if (depth >= maxDepth) {
      return null;
    }
    const count = typeof effect.count === "number"
      ? clampNumber(effect.count, 1, 10)
      : 1;
    const subEffects = normalizeArray(effect.effects).map((e) =>
      repairEffect(e, definition, depth + 1)
    ).filter(Boolean);
    if (subEffects.length === 0) {
      return null;
    }
    return { ...effect, count, effects: subEffects };
  }

  if (effect.kind === "set_flag") {
    const validDurations = ["action", "phase", "turn"];
    if (effect.duration && !validDurations.includes(effect.duration)) {
      return { ...effect, duration: "action" };
    }
  }

  return effect;
}

function repairEffects(effects, definition) {
  return normalizeArray(effects).map((e) => repairEffect(e, definition, 0)).filter(Boolean);
}

function effectReferencesZone(effect) {
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

function hasZoneReferencingEffects(definition) {
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

function repairActions(definition) {
  const actions = normalizeArray(definition.actions);
  return actions.map((action) => {
    if (!action || typeof action !== "object") {
      return action;
    }
    const costs = repairEffects(action.costs, definition);
    const effects = repairEffects(action.effects, definition);
    return { ...action, costs, effects };
  });
}

function repairTriggers(definition) {
  const triggers = normalizeArray(definition.triggers);
  return triggers.map((trigger) => {
    if (!trigger || typeof trigger !== "object") {
      return trigger;
    }
    const effects = repairEffects(trigger.effects, definition);
    return { ...trigger, effects };
  });
}

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

    const actions = normalizeArray(definition.actions);
    if (actions.length === 0) {
      return null;
    }

    const hasActionWithEffects = actions.some(
      (action) => Array.isArray(action?.effects) && action.effects.length > 0
    );
    if (!hasActionWithEffects) {
      return null;
    }

    const conditions = normalizeArray(definition?.termination?.conditions);
    if (conditions.length === 0) {
      return null;
    }

    const zones = normalizeArray(definition?.state?.zones);
    if (zones.length === 0 && hasZoneReferencingEffects(definition)) {
      return null;
    }

    return {
      ...genome,
      definition,
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
