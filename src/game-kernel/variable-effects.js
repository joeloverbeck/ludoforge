import { resolveVarValue, writeVarValue } from "./ref-resolution.js";

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

export function applyVariableDispatch(state, effect, context, options) {
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
