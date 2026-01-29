import { getRandomIndex } from "./random.js";
import { collectVariableTargets, collectZoneTargets, collectTokenTypeTargets } from "./targets.js";

export const EFFECT_KINDS = ["set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide"];

function clampIndex(index, length) {
  return Math.max(0, Math.min(index, length - 1));
}

export function buildRefForKind(kind, definition, rng) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  const tokenTypes = collectTokenTypeTargets(definition);
  const zones = collectZoneTargets(definition);

  if (kind === "move" || kind === "spawn" || kind === "destroy") {
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

  if (variables.length > 0) {
    return { kind: "var", id: variables[0].id };
  }
  if (tokenTypes.length > 0) {
    return { kind: "token", id: tokenTypes[0].id };
  }
  if (zones.length > 0) {
    return { kind: "zone", id: zones[0].id };
  }

  return { kind: "var", id: "unknown" };
}

export function buildEffectProps(kind, definition, rng) {
  const zones = collectZoneTargets(definition);

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
    default:
      return {};
  }
}

export function buildRandomEffect(definition, rng) {
  const kindIndex = getRandomIndex(EFFECT_KINDS.length, rng);
  const kind = EFFECT_KINDS[Math.max(0, kindIndex)];
  const target = buildRefForKind(kind, definition, rng);
  const props = buildEffectProps(kind, definition, rng);
  return { kind, target, ...props };
}
