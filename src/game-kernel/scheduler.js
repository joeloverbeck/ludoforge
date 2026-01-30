import { applyTriggers } from "./triggers.js";
import { clearFlags } from "./flags.js";
import {
  resolveMaxTurns,
  resolveMaxStepsPerTurn,
  resolveMaxTriggerDepth,
  resolveStateHistoryLimit,
} from "./scheduler-config.js";
import { seedLoopHistory, recordLoopState } from "./scheduler-loop-detection.js";
import {
  advancePriorityQueue,
  advanceTokenHolder,
  advanceSimultaneous,
  advanceRandomDraw,
  advanceRoundRobin,
} from "./scheduler-strategies.js";

export function advanceTurnPhase(definition, state, options = {}) {
  const scheduler = definition.turn.scheduler;
  if (
    scheduler !== "round_robin" &&
    scheduler !== "priority_queue" &&
    scheduler !== "token_holder" &&
    scheduler !== "simultaneous" &&
    scheduler !== "random_draw"
  ) {
    return { ok: false, reason: "unsupported-scheduler" };
  }

  const stateHistoryLimit = resolveStateHistoryLimit(options);
  seedLoopHistory(state, stateHistoryLimit);
  const triggerGuard = {
    depth: 0,
    maxDepth: resolveMaxTriggerDepth(options),
    steps: 0,
    maxSteps: resolveMaxStepsPerTurn(options),
  };

  const endResult = applyTriggers(definition, state, "end_phase", {
    playerId: state.turn.currentPlayer,
    phase: state.turn.phase ?? null,
    guard: triggerGuard,
  });
  if (!endResult.ok) {
    return endResult;
  }

  clearFlags(state, "phase");

  const advanceResult = scheduler === "priority_queue"
    ? advancePriorityQueue(definition, state)
    : scheduler === "token_holder"
      ? advanceTokenHolder(definition, state)
      : scheduler === "simultaneous"
        ? advanceSimultaneous(definition, state)
        : scheduler === "random_draw"
          ? advanceRandomDraw(definition, state, options.rng)
          : advanceRoundRobin(definition, state);
  if (advanceResult.ok === false) {
    return advanceResult;
  }
  const { nextPhase, nextPlayer, nextTurn, nextRound } = advanceResult;
  const maxTurns = resolveMaxTurns(definition, options);
  if (typeof maxTurns === "number" && nextTurn > maxTurns) {
    return { ok: false, reason: "max-turns" };
  }

  const turnAdvanced = nextTurn !== state.turn.turn;
  const roundAdvanced = nextRound !== state.turn.round;

  if (roundAdvanced) {
    const endRoundResult = applyTriggers(definition, state, "end_round", {
      playerId: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
      guard: triggerGuard,
    });
    if (!endRoundResult.ok) {
      return endRoundResult;
    }
    clearFlags(state, "round");
  }

  const newTurn = {
    currentPlayer: nextPlayer,
    phase: nextPhase,
    turn: nextTurn,
    round: nextRound,
    turnOrder: state.turn.turnOrder ?? null,
  };
  if (advanceResult._actedThisRound !== undefined) {
    newTurn._actedThisRound = advanceResult._actedThisRound;
  }
  state.turn = newTurn;

  if (turnAdvanced) {
    clearFlags(state, "turn");
  }

  if (roundAdvanced) {
    const startRoundResult = applyTriggers(definition, state, "start_round", {
      playerId: nextPlayer,
      phase: nextPhase,
      guard: triggerGuard,
    });
    if (!startRoundResult.ok) {
      return startRoundResult;
    }
  }

  const startResult = applyTriggers(definition, state, "start_phase", {
    playerId: nextPlayer,
    phase: nextPhase,
    guard: triggerGuard,
  });
  if (!startResult.ok) {
    return startResult;
  }

  const loopCheck = recordLoopState(state, stateHistoryLimit);
  if (loopCheck.looped) {
    return { ok: false, reason: "state-loop", failsafe: { type: "draw", players: "all" } };
  }

  return { ok: true };
}
