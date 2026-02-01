import { applyEffect, buildVariableIndex, evaluateExpr } from "./effects.js";

function snapshotState(state) {
  return JSON.stringify({
    variables: state.variables,
    tokens: state.tokens,
    zones: state.zones,
    turn: state.turn,
  });
}

function collectTriggers(definition) {
  return [...(definition.triggers ?? []), ...(definition.turn.stepEffects ?? [])];
}

function enterTriggerGuard(context) {
  const guard = context.guard;
  if (!guard) {
    return null;
  }
  const depth = typeof guard.depth === "number" ? guard.depth : 0;
  const maxDepth = guard.maxDepth;
  if (typeof maxDepth === "number" && depth >= maxDepth) {
    return { guard, blocked: true, depth };
  }
  guard.depth = depth + 1;
  if (typeof guard.steps !== "number") {
    guard.steps = 0;
  }
  return { guard, blocked: false, depth };
}

function exitTriggerGuard(guardState) {
  if (!guardState?.guard) {
    return;
  }
  guardState.guard.depth = guardState.depth;
}

function checkStepLimit(guardState) {
  if (!guardState?.guard) {
    return false;
  }
  const maxSteps = guardState.guard.maxSteps;
  if (typeof maxSteps !== "number") {
    return false;
  }
  const steps = guardState.guard.steps ?? 0;
  return steps >= maxSteps;
}

export function applyTriggers(definition, state, event, context = {}) {
  const triggers = collectTriggers(definition).filter((trigger) => trigger.event === event);
  if (triggers.length === 0) {
    return { ok: true, fired: false, iterations: 0, appliedEffects: [] };
  }

  const variableIndex = buildVariableIndex(definition);
  const snapshot = snapshotState(state);
  let firedAny = false;
  const appliedEffects = [];
  const guardState = enterTriggerGuard(context);
  if (guardState?.blocked) {
    return { ok: false, reason: "trigger-recursion" };
  }

  try {
    for (const trigger of triggers) {
      if (trigger.condition) {
        const conditionMet = evaluateExpr(trigger.condition, {
          state,
          playerId: context.playerId,
          phase: context.phase,
          variableIndex,
        });
        if (!conditionMet) {
          continue;
        }
      }

      firedAny = true;

      for (const effect of trigger.effects ?? []) {
        if (checkStepLimit(guardState)) {
          return { ok: false, reason: "max-steps" };
        }
        const result = applyEffect(state, effect, {
          state,
          playerId: context.playerId,
          phase: context.phase,
          variableIndex,
          impact: context.impact,
        }, { boundsMode: "clamp" });
        if (!result.ok) {
          return { ok: false, reason: result.reason };
        }
        if (result.appliedEffect) {
          appliedEffects.push({ ...result.appliedEffect, source: "trigger" });
        }
        if (guardState?.guard) {
          guardState.guard.steps += 1;
        }
      }
    }
  } finally {
    exitTriggerGuard(guardState);
  }

  if (firedAny && snapshot === snapshotState(state)) {
    return { ok: false, reason: "trigger-loop" };
  }

  return { ok: true, fired: firedAny, iterations: firedAny ? 1 : 0, appliedEffects };
}
