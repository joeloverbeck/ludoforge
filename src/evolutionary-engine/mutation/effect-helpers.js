import { getRandomIndex } from "./random.js";
import { collectVariableTargets, collectZoneTargets, collectTokenTypeTargets } from "./targets.js";
import { pickOrCreateZone, pickOrCreateTokenType, pickOrCreateVariable } from "./pick-or-create.js";

function collectZonesForTokenType(definition, tokenTypeId) {
  const zones = Array.isArray(definition?.state?.zones) ? definition.state.zones : [];
  return zones.filter(
    (z) => typeof z?.id === "string" && z.tokenType === tokenTypeId
  );
}

export const EFFECT_KINDS = [
  "set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide",
  "move_spatial", "repeat", "set_flag", "conditional",
  "shuffle", "queue_push", "queue_pop",
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
  if (kind === "move" || kind === "spawn" || kind === "destroy" || kind === "move_spatial") {
    const tt = pickOrCreateTokenType(definition, rng);
    if (tt) return { kind: "token", id: tt.id };
  }

  if (kind === "set" || kind === "inc" || kind === "dec") {
    const v = pickOrCreateVariable(definition, rng);
    if (v) return { kind: "var", id: v.id };
  }

  if (kind === "reveal" || kind === "hide") {
    const z = pickOrCreateZone(definition, rng);
    if (z) return { kind: "zone", id: z.id };
  }

  if (kind === "set_flag") {
    const tt = pickOrCreateTokenType(definition, rng);
    if (tt) return { kind: "token", id: tt.id };
    return { kind: "player", id: "self" };
  }

  if (kind === "shuffle") {
    const z = pickOrCreateZone(definition, rng);
    if (z) return { kind: "zone", id: z.id };
  }

  if (kind === "queue_push") {
    const tt = pickOrCreateTokenType(definition, rng);
    if (tt) return { kind: "token", id: tt.id };
  }

  if (kind === "queue_pop") {
    return null;
  }

  return null;
}

export function buildEffectProps(kind, definition, rng) {
  const variableKinds = ["inc", "dec", "set"];

  switch (kind) {
    case "inc":
    case "dec":
      return { amount: 1 };
    case "set":
      return { value: 0 };
    case "move":
    case "spawn": {
      const z = pickOrCreateZone(definition, rng);
      return { toZone: z ? z.id : "default" };
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
    case "shuffle":
      return {};
    case "queue_push": {
      const zPush = pickOrCreateZone(definition, rng);
      return { toZone: zPush ? zPush.id : "default" };
    }
    case "queue_pop": {
      const zPop = pickOrCreateZone(definition, rng);
      return { fromZone: zPop ? zPop.id : "default" };
    }
    default:
      return {};
  }
}

/**
 * Kinds that can fall back to when the preferred kind has no valid target.
 */
const VARIABLE_KINDS = ["set", "inc", "dec"];

const TARGET_OPTIONAL_KINDS = new Set(["repeat", "conditional", "queue_pop"]);

export function buildRandomEffect(definition, rng) {
  const kindIndex = getRandomIndex(EFFECT_KIND_POOL.length, rng);
  let kind = EFFECT_KIND_POOL[Math.max(0, kindIndex)];
  if (TARGET_OPTIONAL_KINDS.has(kind)) {
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
  let props = buildEffectProps(kind, definition, rng);
  if (
    (kind === "move" || kind === "spawn" || kind === "queue_push") &&
    target?.kind === "token" &&
    typeof target.id === "string" &&
    typeof props.toZone === "string"
  ) {
    const compatible = collectZonesForTokenType(definition, target.id);
    if (compatible.length > 0) {
      const idx = getRandomIndex(compatible.length, rng);
      props = { ...props, toZone: compatible[Math.max(0, idx)].id };
    }
  }
  return { kind, target, ...props };
}
