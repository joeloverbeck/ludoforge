import { evaluateExpr, buildVariableIndex } from "./effects.js";
import { getZoneTokens } from "./token-effects.js";

export function resolveSelector(selector, state, context) {
  if (!selector || typeof selector !== "object") {
    return [];
  }
  const zoneId = selector.zone;
  const zone = state.zones?.[zoneId];
  if (!zone) {
    return [];
  }

  let tokenIds;
  const playerSpec = selector.player;
  if (playerSpec === "self" && context.playerId != null) {
    tokenIds = [...getZoneTokens(zone, context.playerId)];
  } else if (playerSpec === "opponent" && context.playerId != null) {
    tokenIds = [];
    if (zone.scope === "per_player") {
      for (const [pid, tIds] of Object.entries(zone.tokensByPlayer ?? {})) {
        if (Number(pid) !== context.playerId) {
          tokenIds = tokenIds.concat(tIds);
        }
      }
    } else {
      tokenIds = [...(zone.tokens ?? [])];
    }
  } else {
    if (zone.scope === "per_player") {
      tokenIds = [];
      for (const tIds of Object.values(zone.tokensByPlayer ?? {})) {
        tokenIds = tokenIds.concat(tIds);
      }
    } else {
      tokenIds = [...(zone.tokens ?? [])];
    }
  }

  if (selector.tokenType) {
    tokenIds = tokenIds.filter((tid) => {
      const token = state.tokens?.[tid];
      return token && token.type === selector.tokenType;
    });
  }

  if (selector.where) {
    tokenIds = tokenIds.filter((tid) => {
      const token = state.tokens?.[tid];
      if (!token) {
        return false;
      }
      return evaluateExpr(selector.where, {
        ...context,
        state,
        bindings: { ...context.bindings, _target: tid },
      });
    });
  }

  if (selector.random && context.rng) {
    for (let i = tokenIds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(context.rng() * (i + 1));
      const temp = tokenIds[i];
      tokenIds[i] = tokenIds[j];
      tokenIds[j] = temp;
    }
  }

  if (typeof selector.count === "number" && selector.count > 0) {
    tokenIds = tokenIds.slice(0, selector.count);
  }

  return tokenIds;
}

export function resolvePlayerSelector(selector, state, context) {
  const agents = state.agents ?? [];
  const playerSpec = selector?.player;
  let ids;
  if (playerSpec === "self") {
    ids = agents.filter((a) => a.id === context.playerId).map((a) => a.id);
  } else if (playerSpec === "opponent") {
    ids = agents.filter((a) => a.id !== context.playerId).map((a) => a.id);
  } else {
    ids = agents.map((a) => a.id);
  }
  if (selector?.random && context.rng) {
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(context.rng() * (i + 1));
      const temp = ids[i];
      ids[i] = ids[j];
      ids[j] = temp;
    }
  }
  if (typeof selector?.count === "number" && selector.count > 0) {
    ids = ids.slice(0, selector.count);
  }
  return ids;
}

export function resolveActionTargets(definition, state, action, context) {
  const targets = action.targets ?? [];
  const bindings = { ...context.bindings };
  const variableIndex = context.variableIndex ?? buildVariableIndex(definition);

  for (const target of targets) {
    if (target.kind === "player") {
      const playerIds = resolvePlayerSelector(target.selector, state, context);
      if (playerIds.length > 0) {
        bindings[target.id] = playerIds[0];
      }
      continue;
    }
    const resolved = resolveSelector(target.selector, state, {
      ...context,
      variableIndex,
    });
    if (resolved.length > 0) {
      bindings[target.id] = resolved[0];
    }
  }

  return bindings;
}
