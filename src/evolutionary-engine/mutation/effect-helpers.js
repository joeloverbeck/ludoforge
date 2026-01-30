import { getRandomIndex } from "./random.js";
import { collectVariableTargets, collectZoneTargets, collectTokenTypeTargets } from "./targets.js";

export const EFFECT_KINDS = [
  "set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide",
  "move_spatial", "repeat", "set_flag", "conditional",
];

const EFFECT_KIND_POOL = [...EFFECT_KINDS, "conditional"];

const FLAG_NAMES = ["no_engage", "protected", "stunned", "hidden", "empowered", "slowed"];
const FLAG_DURATIONS = ["action", "phase", "turn"];

function clampIndex(index, length) {
  return Math.max(0, Math.min(index, length - 1));
}

function collectSpatialZones(definition) {
  const zones = collectZoneTargets(definition);
  return zones.filter((z) => z.spatial?.nodes?.length > 0);
}

export function buildRefForKind(kind, definition, rng) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  const tokenTypes = collectTokenTypeTargets(definition);
  const zones = collectZoneTargets(definition);

  if (kind === "move" || kind === "spawn" || kind === "destroy" || kind === "move_spatial") {
    if (tokenTypes.length > 0) {
      const index = getRandomIndex(tokenTypes.length, rng);
      return { kind: "token", id: tokenTypes[clampIndex(index, tokenTypes.length)].id };
    }
  }

  if (kind === "set" || kind === "inc" || kind === "dec") {
    if (variables.length > 0) {
      const index = getRandomIndex(variables.length, rng);
      return { kind: "var", id: variables[clampIndex(index, variables.length)].id };
    }
  }

  if (kind === "reveal" || kind === "hide") {
    if (zones.length > 0) {
      const index = getRandomIndex(zones.length, rng);
      return { kind: "zone", id: zones[clampIndex(index, zones.length)].id };
    }
  }

  if (kind === "set_flag") {
    if (tokenTypes.length > 0) {
      const index = getRandomIndex(tokenTypes.length, rng);
      return { kind: "token", id: tokenTypes[clampIndex(index, tokenTypes.length)].id };
    }
    return { kind: "player", id: "self" };
  }

  return null;
}

export function buildEffectProps(kind, definition, rng) {
  const zones = collectZoneTargets(definition);
  const variableKinds = ["inc", "dec", "set"];

  switch (kind) {
    case "inc":
    case "dec":
      return { amount: 1 };
    case "set":
      return { value: 0 };
    case "move":
    case "spawn": {
      if (zones.length > 0) {
        const index = getRandomIndex(zones.length, rng);
        return { toZone: zones[clampIndex(index, zones.length)].id };
      }
      return { toZone: "default" };
    }
    case "destroy":
    case "reveal":
    case "hide":
      return {};
    case "move_spatial": {
      const spatialZones = collectSpatialZones(definition);
      if (spatialZones.length > 0) {
        const zIdx = getRandomIndex(spatialZones.length, rng);
        const zone = spatialZones[clampIndex(zIdx, spatialZones.length)];
        const nodes = zone.spatial.nodes;
        const nIdx = getRandomIndex(nodes.length, rng);
        return {
          zone: zone.id,
          toNode: nodes[clampIndex(nIdx, nodes.length)],
        };
      }
      return { zone: "default", toNode: "default" };
    }
    case "repeat": {
      const countVal = (getRandomIndex(5, rng) ?? 0) + 1;
      const innerEffect = buildRandomEffect(definition, rng);
      return { count: countVal, effects: [innerEffect] };
    }
    case "conditional": {
      let target = null;
      for (const variableKind of variableKinds) {
        target = buildRefForKind(variableKind, definition, rng);
        if (target) {
          if (variableKind === "set") {
            return {
              condition: { kind: "value", value: true },
              then: [{ kind: "set", target, value: 0 }],
              else: [{ kind: "set", target, value: 1 }],
            };
          }
          return {
            condition: { kind: "value", value: true },
            then: [{ kind: variableKind, target, amount: 1 }],
            else: [{ kind: variableKind, target, amount: 2 }],
          };
        }
      }
      return {
        condition: { kind: "value", value: true },
        then: [],
      };
    }
    case "set_flag": {
      const flagIdx = getRandomIndex(FLAG_NAMES.length, rng);
      const durIdx = getRandomIndex(FLAG_DURATIONS.length, rng);
      return {
        flag: FLAG_NAMES[clampIndex(flagIdx, FLAG_NAMES.length)],
        duration: FLAG_DURATIONS[clampIndex(durIdx, FLAG_DURATIONS.length)],
      };
    }
    default:
      return {};
  }
}

/**
 * Kinds that can fall back to when the preferred kind has no valid target.
 */
const VARIABLE_KINDS = ["set", "inc", "dec"];

export function buildRandomEffect(definition, rng) {
  const kindIndex = getRandomIndex(EFFECT_KIND_POOL.length, rng);
  let kind = EFFECT_KIND_POOL[Math.max(0, kindIndex)];
  if (kind === "repeat" || kind === "conditional") {
    const props = buildEffectProps(kind, definition, rng);
    return { kind, ...props };
  }
  let target = buildRefForKind(kind, definition, rng);
  if (target === null) {
    kind = VARIABLE_KINDS[getRandomIndex(VARIABLE_KINDS.length, rng)] ?? "inc";
    target = buildRefForKind(kind, definition, rng);
    if (target === null) {
      return { kind: "inc", target: { kind: "var", id: "unknown" }, amount: 1 };
    }
  }
  const props = buildEffectProps(kind, definition, rng);
  return { kind, target, ...props };
}
