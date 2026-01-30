import { applyTriggers } from "./triggers.js";
import { clearFlags } from "./flags.js";

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

function advancePriorityQueue(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  if (phaseIndex < phases.length - 1) {
    return {
      nextPhase: phases[phaseIndex + 1],
      nextPlayer: state.turn.currentPlayer,
      nextTurn: state.turn.turn,
      nextRound: state.turn.round,
      _actedThisRound: state.turn._actedThisRound,
    };
  }

  const orderBy = definition.turn.orderBy;
  const playerCount = definition.players.count;
  const players = [];
  for (let pid = 1; pid <= playerCount; pid++) {
    const value = state.variables.perPlayer[pid]?.[orderBy.variable] ?? 0;
    players.push({ id: pid, value });
  }

  const ascending = orderBy.direction === "asc";
  players.sort((a, b) => {
    const cmp = ascending ? a.value - b.value : b.value - a.value;
    return cmp !== 0 ? cmp : a.id - b.id;
  });

  const nextPlayer = players[0].id;
  const nextTurn = state.turn.turn + 1;

  const acted = state.turn._actedThisRound ?? new Set();
  acted.add(state.turn.currentPlayer);

  let nextRound = state.turn.round;
  let nextActed = acted;
  if (acted.size >= playerCount) {
    nextRound = state.turn.round + 1;
    nextActed = new Set();
  }

  return {
    nextPhase: phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

function findTokenHolder(definition, state) {
  const tokenType = definition.turn.tokenType;
  const zoneId = definition.turn.zone;
  if (!tokenType || !zoneId) {
    return { ok: false, reason: "token-holder-missing-config" };
  }
  const zone = state.zones?.[zoneId];
  if (!zone || zone.scope !== "per_player") {
    return { ok: false, reason: "token-holder-not-found" };
  }
  for (let pid = 1; pid <= definition.players.count; pid += 1) {
    const tokens = zone.tokensByPlayer?.[pid] ?? [];
    for (const tokenId of tokens) {
      const token = state.tokens[tokenId];
      if (token?.type === tokenType) {
        return { ok: true, playerId: pid };
      }
    }
  }
  return { ok: false, reason: "token-holder-not-found" };
}

function advanceTokenHolder(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  if (phaseIndex < phases.length - 1) {
    return {
      nextPhase: phases[phaseIndex + 1],
      nextPlayer: state.turn.currentPlayer,
      nextTurn: state.turn.turn,
      nextRound: state.turn.round,
      _actedThisRound: state.turn._actedThisRound,
    };
  }

  const holderResult = findTokenHolder(definition, state);
  if (!holderResult.ok) {
    return holderResult;
  }

  const nextPlayer = holderResult.playerId;
  const nextTurn = state.turn.turn + 1;

  const acted = state.turn._actedThisRound ?? new Set();
  acted.add(state.turn.currentPlayer);

  let nextRound = state.turn.round;
  let nextActed = acted;
  if (acted.size >= definition.players.count) {
    nextRound = state.turn.round + 1;
    nextActed = new Set();
  }

  return {
    nextPhase: phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

function advanceRandomDraw(definition, state, rng) {
  if (!rng) {
    return { ok: false, reason: "random-draw-missing-rng" };
  }

  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  if (phaseIndex < phases.length - 1) {
    return {
      nextPhase: phases[phaseIndex + 1],
      nextPlayer: state.turn.currentPlayer,
      nextTurn: state.turn.turn,
      nextRound: state.turn.round,
      _actedThisRound: state.turn._actedThisRound,
    };
  }

  const playerCount = definition.players.count;
  const nextPlayer = Math.floor(rng() * playerCount) + 1;
  const nextTurn = state.turn.turn + 1;

  const acted = state.turn._actedThisRound ?? new Set();
  acted.add(state.turn.currentPlayer);

  let nextRound = state.turn.round;
  let nextActed = acted;
  if (acted.size >= playerCount) {
    nextRound = state.turn.round + 1;
    nextActed = new Set();
  }

  return {
    nextPhase: phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

function resolveNextPlayerRoundRobin(currentPlayer, playerCount, turnOrder) {
  if (Array.isArray(turnOrder) && turnOrder.length === playerCount) {
    const idx = turnOrder.indexOf(currentPlayer);
    if (idx >= 0 && idx < turnOrder.length - 1) {
      return { nextPlayer: turnOrder[idx + 1], wrapped: false };
    }
    return { nextPlayer: turnOrder[0], wrapped: true };
  }
  const next = (currentPlayer % playerCount) + 1;
  return { nextPlayer: next, wrapped: next === 1 };
}

function advanceRoundRobin(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  let nextPhase = phases[phaseIndex];
  let nextPlayer = state.turn.currentPlayer;
  let nextTurn = state.turn.turn;
  let nextRound = state.turn.round;

  if (phaseIndex >= phases.length - 1) {
    nextPhase = phases[0];
    const resolved = resolveNextPlayerRoundRobin(
      state.turn.currentPlayer,
      definition.players.count,
      state.turn.turnOrder
    );
    nextPlayer = resolved.nextPlayer;
    nextTurn = state.turn.turn + 1;
    if (resolved.wrapped) {
      nextRound = state.turn.round + 1;
    }
  } else {
    nextPhase = phases[phaseIndex + 1];
  }

  return { nextPhase, nextPlayer, nextTurn, nextRound };
}

function advanceSimultaneous(definition, state) {
  const phases = resolvePhases(definition);
  const currentPhase = state.turn.phase ?? null;
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = currentIndex >= 0 ? currentIndex : 0;

  let nextPhase = phases[phaseIndex];
  let nextTurn = state.turn.turn;
  let nextRound = state.turn.round;

  if (phaseIndex >= phases.length - 1) {
    nextPhase = phases[0];
    nextTurn = state.turn.turn + 1;
    nextRound = state.turn.round + 1;
  } else {
    nextPhase = phases[phaseIndex + 1];
  }

  return { nextPhase, nextPlayer: 1, nextTurn, nextRound };
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
      turn: state.turn.turn,
      round: state.turn.round,
      turnOrder: state.turn.turnOrder ?? null,
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
