import { resolveVarValue, writeVarValue } from "./ref-resolution.js";
import { evaluateExpr } from "./expression-eval.js";
import {
  applyTokenSpawn,
  applyTokenMove,
  applyTokenDestroy,
  applyTokenReveal,
  applyTokenHide,
} from "./token-effects.js";

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

function resolveTargetPlayerId(playerRef, context) {
  if (playerRef == null) {
    return context.playerId;
  }
  if (playerRef === "self") {
    return context.playerId;
  }
  if (playerRef === "opponent") {
    const agents = context.state?.agents ?? [];
    const opponent = agents.find((a) => a.id !== context.playerId);
    return opponent ? opponent.id : context.playerId;
  }
  const bound = context.bindings?.[playerRef];
  if (bound != null) {
    return bound;
  }
  return context.playerId;
}

function applyVariableEffect(state, variable, effect, context, options, targetPlayerId) {
  const pid = targetPlayerId ?? context.playerId;
  const current = resolveVarValue(state, variable, pid);
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

  writeVarValue(state, variable, pid, next);
  recordImpact(context, variable, pid);
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

function applyConditional(state, effect, context, options) {
  const condition = effect.condition;
  const thenEffects = Array.isArray(effect.then) ? effect.then : null;
  const elseEffects = Array.isArray(effect.else) ? effect.else : [];
  if (!condition || !thenEffects) {
    return { ok: false, reason: "missing-conditional-params" };
  }
  const conditionMet = evaluateExpr(condition, context);
  const branch = conditionMet ? thenEffects : elseEffects;
  const applied = [];
  for (const subEffect of branch) {
    const result = applyEffect(state, subEffect, context, options);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    if (result.appliedEffect) {
      applied.push(result.appliedEffect);
    }
  }
  return { ok: true, appliedEffect: { kind: "conditional", conditionMet, applied } };
}

function applySetTurnOrder(state, effect, context) {
  const variable = effect.variable;
  const direction = effect.direction;
  if (!variable || !direction) {
    return { ok: false, reason: "missing-set-turn-order-params" };
  }
  const playerCount = context.state?.agents?.length ?? 0;
  if (playerCount === 0) {
    return { ok: false, reason: "no-agents" };
  }
  const players = [];
  for (let pid = 1; pid <= playerCount; pid++) {
    const value = state.variables?.perPlayer?.[pid]?.[variable] ?? 0;
    players.push({ id: pid, value });
  }
  const ascending = direction === "asc";
  players.sort((a, b) => {
    const cmp = ascending ? a.value - b.value : b.value - a.value;
    return cmp !== 0 ? cmp : a.id - b.id;
  });
  const turnOrder = players.map((p) => p.id);
  state.turn.turnOrder = turnOrder;
  return {
    ok: true,
    appliedEffect: {
      kind: "set_turn_order",
      variable,
      direction,
      turnOrder,
    },
  };
}

function applyChoose(state, effect, context, options) {
  const allOptions = Array.isArray(effect.options) ? effect.options : [];
  if (allOptions.length === 0) {
    return { ok: true, appliedEffect: { kind: "choose", selected: [], applied: [] } };
  }
  const count = typeof effect.count === "number" ? effect.count : 1;
  const available = allOptions.slice();
  const selected = [];
  const rng = context.rng;

  for (let i = 0; i < count && available.length > 0; i += 1) {
    const idx = rng?.nextInt
      ? rng.nextInt(available.length)
      : Math.floor(Math.random() * available.length);
    selected.push(available[idx]);
    available.splice(idx, 1);
  }

  const applied = [];
  for (const optionEffects of selected) {
    for (const subEffect of optionEffects) {
      const result = applyEffect(state, subEffect, context, options);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      if (result.appliedEffect) {
        applied.push(result.appliedEffect);
      }
    }
  }
  return { ok: true, appliedEffect: { kind: "choose", selected: selected.length, applied } };
}

function applyShuffle(state, effect, context) {
  const zoneRef = effect.target;
  if (!zoneRef || zoneRef.kind !== "zone") {
    return { ok: false, reason: "missing-shuffle-params" };
  }
  const zone = state.zones?.[zoneRef.id];
  if (!zone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const playerId = context.playerId;
  const tokens =
    zone.scope === "per_player" && playerId != null
      ? (zone.tokensByPlayer?.[playerId] ?? [])
      : (zone.tokens ?? []);

  if (tokens.length <= 1) {
    return { ok: true, appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: false } };
  }

  const shuffled = [...tokens];
  const rng = context.rng;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng?.nextInt
      ? rng.nextInt(i + 1)
      : Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = shuffled;
  } else {
    zone.tokens = shuffled;
  }

  return {
    ok: true,
    appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: true },
  };
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

  if (effect.kind === "conditional") {
    return applyConditional(state, effect, context, options);
  }

  if (effect.kind === "move_spatial") {
    return applyMoveSpatial(state, effect, context);
  }

  if (effect.kind === "set_flag") {
    return applySetFlag(state, effect, context);
  }

  if (effect.kind === "set_turn_order") {
    return applySetTurnOrder(state, effect, context);
  }

  if (effect.kind === "choose") {
    return applyChoose(state, effect, context, options);
  }

  if (effect.kind === "shuffle") {
    return applyShuffle(state, effect, context);
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
  const targetPlayerId = resolveTargetPlayerId(effect.target.player, context);
  const result = applyVariableEffect(state, variable, effect, context, options, targetPlayerId);
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
