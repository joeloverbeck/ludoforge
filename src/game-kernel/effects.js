import {
  applyTokenSpawn,
  applyTokenMove,
  applyTokenDestroy,
  applyTokenReveal,
  applyTokenHide,
  getZoneTokens,
} from "./token-effects.js";

function resolveVarValue(state, variable, playerId) {
  if (variable.scope === "global") {
    return state.variables.global[variable.id];
  }
  if (playerId == null) {
    return undefined;
  }
  return state.variables.perPlayer[playerId]?.[variable.id];
}

function writeVarValue(state, variable, playerId, value) {
  if (variable.scope === "global") {
    state.variables.global[variable.id] = value;
    return;
  }
  if (playerId == null) {
    return;
  }
  state.variables.perPlayer[playerId][variable.id] = value;
}

function evaluateValue(expr, context) {
  if (!expr || typeof expr !== "object") {
    return undefined;
  }
  switch (expr.kind) {
    case "value":
      return expr.value;
    case "ref":
      return resolveRefValue(expr.ref, context);
    case "cmp":
    case "and":
    case "or":
    case "not":
      return evaluateExpr(expr, context);
    default:
      return undefined;
  }
}

function compareValues(left, right, op) {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "<":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "<=":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case ">":
      return typeof left === "number" && typeof right === "number" && left > right;
    case ">=":
      return typeof left === "number" && typeof right === "number" && left >= right;
    default:
      return false;
  }
}

export function evaluateExpr(expr, context) {
  if (!expr || typeof expr !== "object") {
    return false;
  }
  switch (expr.kind) {
    case "and":
      return Boolean(evaluateExpr(expr.left, context)) && Boolean(evaluateExpr(expr.right, context));
    case "or":
      return Boolean(evaluateExpr(expr.left, context)) || Boolean(evaluateExpr(expr.right, context));
    case "not":
      return !Boolean(evaluateExpr(expr.value, context));
    case "cmp": {
      const left = evaluateValue(expr.left, context);
      const right = evaluateValue(expr.right, context);
      return compareValues(left, right, expr.op ?? "==");
    }
    case "value":
      return Boolean(expr.value);
    case "ref":
      return Boolean(resolveRefValue(expr.ref, context));
    default:
      return false;
  }
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

function resolveRefValue(ref, context) {
  if (!ref || typeof ref !== "object") {
    return undefined;
  }
  if (ref.kind === "var") {
    const variable = context.variableIndex.get(ref.id);
    if (!variable) {
      return undefined;
    }
    return resolveVarValue(context.state, variable, context.playerId);
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

function clampValue(value, min, max) {
  let next = value;
  if (typeof min === "number" && next < min) {
    next = min;
  }
  if (typeof max === "number" && next > max) {
    next = max;
  }
  return next;
}

function recordImpact(context, variable, playerId) {
  const impact = context?.impact;
  if (!impact) {
    return;
  }
  if (variable.scope === "global") {
    impact.affectedGlobal = true;
    return;
  }
  if (playerId == null) {
    return;
  }
  impact.affectedPlayerIds.add(playerId);
}

function applyVariableEffect(state, variable, effect, context, options) {
  const current = resolveVarValue(state, variable, context.playerId);
  let next = current;
  let clamped = false;

  switch (effect.kind) {
    case "set":
      next = effect.value ?? current;
      break;
    case "inc": {
      const amount = effect.amount ?? 0;
      if (typeof current !== "number" || typeof amount !== "number") {
        return { ok: false, reason: "non-numeric-target" };
      }
      next = current + amount;
      break;
    }
    case "dec": {
      const amount = effect.amount ?? 0;
      if (typeof current !== "number" || typeof amount !== "number") {
        return { ok: false, reason: "non-numeric-target" };
      }
      next = current - amount;
      break;
    }
    default:
      return { ok: true };
  }

  const boundsMode = options?.boundsMode;
  if (boundsMode && variable.type.kind === "int" && typeof next === "number") {
    const min = variable.type.min;
    const max = variable.type.max;
    if (boundsMode === "reject") {
      if (typeof min === "number" && next < min) {
        return { ok: false, reason: "bounds" };
      }
      if (typeof max === "number" && next > max) {
        return { ok: false, reason: "bounds" };
      }
    } else {
      const clampedValue = clampValue(next, min, max);
      if (clampedValue !== next) {
        next = clampedValue;
        clamped = true;
      }
    }
  }

  writeVarValue(state, variable, context.playerId, next);
  recordImpact(context, variable, context.playerId);
  return { ok: true, clamped };
}

function applyMoveSpatial(state, effect, context) {
  const tokenId = effect.target?.id;
  const zoneId = effect.zone;
  const toNode = effect.toNode;
  if (!tokenId || !zoneId || !toNode) {
    return { ok: false, reason: "missing-move-spatial-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens?.[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  const zone = state.zones?.[zoneId];
  if (!zone?.spatial) {
    return { ok: false, reason: "zone-not-spatial" };
  }
  const currentNode = token.node;
  if (!currentNode) {
    return { ok: false, reason: "token-has-no-node" };
  }
  const edges = zone.spatial.edges ?? [];
  const isAdjacent = edges.some(
    (edge) =>
      (edge[0] === currentNode && edge[1] === toNode) ||
      (edge[1] === currentNode && edge[0] === toNode)
  );
  if (!isAdjacent) {
    return { ok: false, reason: "not-adjacent" };
  }
  token.node = toNode;
  return {
    ok: true,
    appliedEffect: {
      kind: "move_spatial",
      target: { kind: "token", id: tokenId },
      zone: zoneId,
      fromNode: currentNode,
      toNode,
      tokenId: resolvedId,
    },
  };
}

function applyRepeat(state, effect, context, options) {
  const count = effect.count ?? 1;
  const subEffects = effect.effects ?? [];
  const collected = [];
  for (let i = 0; i < count; i += 1) {
    for (const subEffect of subEffects) {
      const result = applyEffect(state, subEffect, context, options);
      if (!result.ok) {
        return { ok: true, appliedEffect: { kind: "repeat", count: i, applied: collected } };
      }
      if (result.appliedEffect) {
        collected.push(result.appliedEffect);
      }
    }
  }
  return { ok: true, appliedEffect: { kind: "repeat", count, applied: collected } };
}

function applySetFlag(state, effect, context) {
  const targetRef = effect.target;
  const flag = effect.flag;
  const duration = effect.duration ?? "action";
  if (!targetRef || !flag) {
    return { ok: false, reason: "missing-flag-params" };
  }
  let entity;
  if (targetRef.kind === "token") {
    const resolvedId = context.bindings?.[targetRef.id] ?? targetRef.id;
    entity = state.tokens?.[resolvedId];
  } else if (targetRef.kind === "player") {
    const playerId = targetRef.id === "self" ? context.playerId : targetRef.id;
    entity = state.agents?.find((a) => String(a.id) === String(playerId));
  }
  if (!entity) {
    return { ok: false, reason: "entity-not-found" };
  }
  if (!entity.flags) {
    entity.flags = {};
  }
  entity.flags[flag] = { duration };
  return {
    ok: true,
    appliedEffect: {
      kind: "set_flag",
      target: targetRef,
      flag,
      duration,
    },
  };
}

export function applyEffect(state, effect, context, options) {
  if (!effect || typeof effect !== "object") {
    return { ok: true };
  }

  if (effect.kind === "repeat") {
    return applyRepeat(state, effect, context, options);
  }

  if (effect.kind === "move_spatial") {
    return applyMoveSpatial(state, effect, context);
  }

  if (effect.kind === "set_flag") {
    return applySetFlag(state, effect, context);
  }

  if (!effect.target) {
    return { ok: true };
  }

  if (effect.target.kind === "token") {
    switch (effect.kind) {
      case "spawn":
        return applyTokenSpawn(state, effect, context, options);
      case "move":
        return applyTokenMove(state, effect, context);
      case "destroy":
        return applyTokenDestroy(state, effect, context);
      case "reveal":
        return applyTokenReveal(state, effect, context);
      case "hide":
        return applyTokenHide(state, effect, context);
      default:
        return { ok: true };
    }
  }

  if (effect.target.kind !== "var") {
    return { ok: true };
  }

  const variable = context.variableIndex.get(effect.target.id);
  if (!variable) {
    return { ok: false, reason: "unknown-variable" };
  }
  const result = applyVariableEffect(state, variable, effect, context, options);
  if (!result.ok) {
    return result;
  }
  const resolvedTarget = { kind: "var", id: variable.id, scope: variable.scope };
  const appliedEffect = { kind: effect.kind, target: resolvedTarget };
  if (effect.kind === "set") {
    appliedEffect.value = effect.value;
  } else if (effect.kind === "inc" || effect.kind === "dec") {
    appliedEffect.amount = effect.amount ?? 0;
  }
  return { ...result, appliedEffect };
}
