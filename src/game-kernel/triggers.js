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

export function applyTriggers(definition, state, event, context = {}) {
  const triggers = collectTriggers(definition).filter((trigger) => trigger.event === event);
  if (triggers.length === 0) {
    return { ok: true, fired: false, iterations: 0 };
  }

  const variableIndex = buildVariableIndex(definition);
  const snapshot = snapshotState(state);
  let firedAny = false;

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
      const result = applyEffect(state, effect, {
        state,
        playerId: context.playerId,
        phase: context.phase,
        variableIndex,
      });
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
    }
  }

  if (firedAny && snapshot === snapshotState(state)) {
    return { ok: false, reason: "trigger-loop" };
  }

  return { ok: true, fired: firedAny, iterations: firedAny ? 1 : 0 };
}
