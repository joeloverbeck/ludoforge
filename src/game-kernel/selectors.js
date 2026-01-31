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
  if (typeof selector?.count === "number" && selector.count > 0) {
    ids = ids.slice(0, selector.count);
  }
  return ids;
}

/**
 * Computes valid choice domains for each param in an action definition.
 * Returns a map from param id to an array of all valid candidate values.
 *
 * @param {Array} params - The params array from an ActionDef
 * @param {object} state - Current game state
 * @param {object} context - Execution context (playerId, bindings, etc.)
 * @returns {Record<string, Array<string|number>>}
 */
export function resolveParamDomains(params, state, context) {
  if (!Array.isArray(params) || params.length === 0) {
    return {};
  }

  const domains = {};

  for (const param of params) {
    const { id, kind, domain } = param;
    if (!id || !domain) {
      continue;
    }

    if (kind === "token") {
      domains[id] = resolveSelector(domain.selector, state, context);
    } else if (kind === "player") {
      const values = domain.values;
      if (Array.isArray(values)) {
        domains[id] = [...values];
      } else {
        domains[id] = resolvePlayerSelector({ player: values }, state, context);
      }
    } else if (kind === "zone") {
      domains[id] = Array.isArray(domain.values) ? [...domain.values] : [];
    }
  }

  return domains;
}

export function resolveActionTargets(definition, state, action, context) {
  const targets = action.params ?? action.targets ?? [];
  const bindings = { ...context.bindings };
  const variableIndex = context.variableIndex ?? buildVariableIndex(definition);

  for (const target of targets) {
    const selector = target.domain?.selector ?? target.selector;
    if (target.kind === "player") {
      const playerIds = resolvePlayerSelector(selector, state, context);
      if (playerIds.length > 0) {
        bindings[target.id] = playerIds[0];
      }
      continue;
    }
    const resolved = resolveSelector(selector, state, {
      ...context,
      variableIndex,
    });
    if (resolved.length > 0) {
      bindings[target.id] = resolved[0];
    }
  }

  return bindings;
}
