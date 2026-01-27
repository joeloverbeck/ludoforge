import { applyTriggers } from "./triggers.js";

function resolvePhases(definition) {
  const phases = definition.turn.phases ?? [];
  if (phases.length === 0) {
    return [null];
  }
  return phases;
}

function advanceRoundRobin(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  let nextPhase = phases[phaseIndex];
  let nextPlayer = state.turn.currentPlayer;
  let nextTurn = state.turn.turn;

  if (phaseIndex >= phases.length - 1) {
    nextPhase = phases[0];
    nextPlayer = (state.turn.currentPlayer % definition.players.count) + 1;
    nextTurn = state.turn.turn + 1;
  } else {
    nextPhase = phases[phaseIndex + 1];
  }

  return { nextPhase, nextPlayer, nextTurn };
}

function resolveMaxTurns(definition, options) {
  if (typeof options.maxTurns === "number") {
    return options.maxTurns;
  }
  if (typeof definition.termination?.maxTurns === "number") {
    return definition.termination.maxTurns;
  }
  return undefined;
}

export function advanceTurnPhase(definition, state, options = {}) {
  if (definition.turn.scheduler !== "round_robin") {
    return { ok: false, reason: "unsupported-scheduler" };
  }

  const endResult = applyTriggers(definition, state, "end_phase", {
    playerId: state.turn.currentPlayer,
    phase: state.turn.phase ?? null,
  });
  if (!endResult.ok) {
    return endResult;
  }

  const { nextPhase, nextPlayer, nextTurn } = advanceRoundRobin(definition, state);
  const maxTurns = resolveMaxTurns(definition, options);
  if (typeof maxTurns === "number" && nextTurn > maxTurns) {
    return { ok: false, reason: "max-turns" };
  }

  state.turn = {
    currentPlayer: nextPlayer,
    phase: nextPhase,
    turn: nextTurn,
  };

  const startResult = applyTriggers(definition, state, "start_phase", {
    playerId: nextPlayer,
    phase: nextPhase,
  });
  if (!startResult.ok) {
    return startResult;
  }

  return { ok: true };
}
