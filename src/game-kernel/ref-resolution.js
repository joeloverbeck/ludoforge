import { getZoneTokens } from "./token-effects.js";

export function resolveVarValue(state, variable, playerId) {
  if (variable.scope === "global") {
    return state.variables.global[variable.id];
  }
  if (playerId == null) {
    return undefined;
  }
  return state.variables.perPlayer[playerId]?.[variable.id];
}

export function writeVarValue(state, variable, playerId, value) {
  if (variable.scope === "global") {
    state.variables.global[variable.id] = value;
    return;
  }
  if (playerId == null) {
    return;
  }
  state.variables.perPlayer[playerId][variable.id] = value;
}

function resolveTokenRef(ref, context) {
  const state = context.state;
  const resolvedId = context.bindings?.[ref.id] ?? ref.id;
  const token = state?.tokens?.[resolvedId];
  if (!token) {
    return undefined;
  }
  if (ref.attribute) {
    if (ref.attribute === "node") {
      return token.node;
    }
    return token.attributes?.[ref.attribute];
  }
  return true;
}

function resolveZoneQuery(ref, context) {
  const state = context.state;
  const zone = state?.zones?.[ref.id];
  if (!zone) {
    return undefined;
  }
  let tokens;
  if (ref.player === "self" && context.playerId != null) {
    tokens = getZoneTokens(zone, context.playerId);
  } else if (ref.player === "opponent" && context.playerId != null) {
    tokens = [];
    if (zone.scope === "per_player") {
      for (const [pid, tIds] of Object.entries(zone.tokensByPlayer ?? {})) {
        if (Number(pid) !== context.playerId) {
          tokens = tokens.concat(tIds);
        }
      }
    } else {
      tokens = zone.tokens ?? [];
    }
  } else {
    if (zone.scope === "per_player") {
      tokens = [];
      for (const tIds of Object.values(zone.tokensByPlayer ?? {})) {
        tokens = tokens.concat(tIds);
      }
    } else {
      tokens = zone.tokens ?? [];
    }
  }
  if (ref.tokenType) {
    tokens = tokens.filter((tid) => {
      const t = state.tokens?.[tid];
      return t && t.type === ref.tokenType;
    });
  }
  if (ref.query === "count") {
    return tokens.length;
  }
  if (ref.query === "has_token") {
    return tokens.length > 0;
  }
  return undefined;
}

function resolveFlagQuery(ref, context) {
  const state = context.state;
  const resolvedId = context.bindings?.[ref.id] ?? ref.id;
  const entity =
    state?.tokens?.[resolvedId] ??
    state?.agents?.find((a) => String(a.id) === resolvedId || a.id === resolvedId);
  return entity?.flags?.[ref.flag] != null;
}

export function resolveRefValue(ref, context) {
  if (!ref || typeof ref !== "object") {
    return undefined;
  }
  if (ref.kind === "var") {
    const variable = context.variableIndex.get(ref.id);
    if (!variable) {
      return undefined;
    }
    let pid = context.playerId;
    const playerRef = ref.player;
    if (playerRef === "opponent") {
      const agents = context.state?.agents ?? [];
      const opp = agents.find((a) => a.id !== context.playerId);
      if (opp) {
        pid = opp.id;
      }
    } else if (playerRef != null && playerRef !== "self") {
      const bound = context.bindings?.[playerRef];
      if (bound != null) {
        pid = bound;
      }
    }
    return resolveVarValue(context.state, variable, pid);
  }
  if (ref.kind === "token") {
    return resolveTokenRef(ref, context);
  }
  if (ref.kind === "zone_query") {
    return resolveZoneQuery(ref, context);
  }
  if (ref.kind === "flag_query") {
    return resolveFlagQuery(ref, context);
  }
  return undefined;
}

export function buildVariableIndex(definition) {
  const index = new Map();
  for (const variable of definition.state.variables) {
    index.set(variable.id, variable);
  }
  return index;
}
