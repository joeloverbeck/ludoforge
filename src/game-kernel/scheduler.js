import { applyTriggers } from "./triggers.js";

const DEFAULT_MAX_TRIGGER_DEPTH = 8;
const DEFAULT_MAX_STEPS_PER_TURN = 1000;
const DEFAULT_STATE_HISTORY_LIMIT = 256;

const loopHistoryByState = new WeakMap();

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

function resolveMaxStepsPerTurn(options) {
  if (typeof options.maxStepsPerTurn === "number") {
    return options.maxStepsPerTurn;
  }
  return DEFAULT_MAX_STEPS_PER_TURN;
}

function resolveMaxTriggerDepth(options) {
  if (typeof options.maxTriggerDepth === "number") {
    return options.maxTriggerDepth;
  }
  return DEFAULT_MAX_TRIGGER_DEPTH;
}

function resolveStateHistoryLimit(options) {
  if (typeof options.stateHistoryLimit === "number") {
    return options.stateHistoryLimit;
  }
  return DEFAULT_STATE_HISTORY_LIMIT;
}

function snapshotLoopState(state) {
  return JSON.stringify({
    variables: state.variables,
    tokens: state.tokens,
    zones: state.zones,
    turn: {
      currentPlayer: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
    },
  });
}

function getLoopHistory(state) {
  let history = loopHistoryByState.get(state);
  if (!history) {
    history = { snapshots: new Set(), order: [] };
    loopHistoryByState.set(state, history);
  }
  return history;
}

function seedLoopHistory(state, limit) {
  const history = getLoopHistory(state);
  if (history.order.length > 0) {
    return;
  }
  const snapshot = snapshotLoopState(state);
  history.snapshots.add(snapshot);
  history.order.push(snapshot);
  if (history.order.length > limit) {
    const oldest = history.order.shift();
    history.snapshots.delete(oldest);
  }
}

function recordLoopState(state, limit) {
  const history = getLoopHistory(state);
  const snapshot = snapshotLoopState(state);
  if (history.snapshots.has(snapshot)) {
    return { looped: true, snapshot };
  }
  history.snapshots.add(snapshot);
  history.order.push(snapshot);
  if (history.order.length > limit) {
    const oldest = history.order.shift();
    history.snapshots.delete(oldest);
  }
  return { looped: false, snapshot };
}

export function advanceTurnPhase(definition, state, options = {}) {
  if (definition.turn.scheduler !== "round_robin") {
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
