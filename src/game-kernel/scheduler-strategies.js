import {
  resolvePhaseAdvance,
  advanceRoundTracking,
} from "./scheduler-phase-cycling.js";
import { evaluateExpr, buildVariableIndex } from "./effects.js";

export function advancePriorityQueue(definition, state) {
  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
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

  const { nextRound, nextActed } = advanceRoundTracking(state, playerCount);

  return {
    nextPhase: phaseResult.phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

export function findTokenHolder(definition, state) {
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

export function advanceTokenHolder(definition, state) {
  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
  }

  const holderResult = findTokenHolder(definition, state);
  if (!holderResult.ok) {
    return holderResult;
  }

  const nextPlayer = holderResult.playerId;
  const nextTurn = state.turn.turn + 1;

  const { nextRound, nextActed } = advanceRoundTracking(
    state,
    definition.players.count
  );

  return {
    nextPhase: phaseResult.phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

export function advanceRandomDraw(definition, state, rng) {
  if (!rng) {
    return { ok: false, reason: "random-draw-missing-rng" };
  }

  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
  }

  const playerCount = definition.players.count;
  const nextPlayer = Math.floor(rng() * playerCount) + 1;
  const nextTurn = state.turn.turn + 1;

  const { nextRound, nextActed } = advanceRoundTracking(state, playerCount);

  return {
    nextPhase: phaseResult.phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
  };
}

export function resolveNextPlayerRoundRobin(
  currentPlayer,
  playerCount,
  turnOrder
) {
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

export function advanceRoundRobin(definition, state) {
  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
  }

  const phases = phaseResult.phases;
  const resolved = resolveNextPlayerRoundRobin(
    state.turn.currentPlayer,
    definition.players.count,
    state.turn.turnOrder
  );
  const nextPlayer = resolved.nextPlayer;
  const nextTurn = state.turn.turn + 1;
  let nextRound = state.turn.round;
  if (resolved.wrapped) {
    nextRound = state.turn.round + 1;
  }

  return { nextPhase: phases[0], nextPlayer, nextTurn, nextRound };
}

export function advanceSimultaneous(definition, state) {
  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
  }

  const phases = phaseResult.phases;
  const nextTurn = state.turn.turn + 1;
  const nextRound = state.turn.round + 1;

  return { nextPhase: phases[0], nextPlayer: 1, nextTurn, nextRound };
}

export function findEligibleReactivePlayers(definition, state) {
  const stepEffects = definition.turn.stepEffects ?? [];
  const conditioned = stepEffects.filter((t) => t.condition);
  const playerCount = definition.players.count;

  if (conditioned.length === 0) {
    return [];
  }

  const variableIndex = buildVariableIndex(definition);
  const eligible = [];

  for (let pid = 1; pid <= playerCount; pid++) {
    for (const trigger of conditioned) {
      const met = evaluateExpr(trigger.condition, {
        state,
        playerId: pid,
        phase: state.turn.phase ?? null,
        variableIndex,
      });
      if (met) {
        eligible.push(pid);
        break;
      }
    }
  }

  return eligible;
}

export function advanceReactive(definition, state) {
  const phaseResult = resolvePhaseAdvance(definition, state);
  if (phaseResult.cycling) {
    return phaseResult.result;
  }

  const playerCount = definition.players.count;
  const eligible = findEligibleReactivePlayers(definition, state);

  const nextPlayer = eligible.length > 0 ? eligible[0] : 1;
  const nextTurn = state.turn.turn + 1;

  const { nextRound, nextActed } = advanceRoundTracking(state, playerCount);

  return {
    nextPhase: phaseResult.phases[0],
    nextPlayer,
    nextTurn,
    nextRound,
    _actedThisRound: nextActed,
    _noEligible: eligible.length === 0,
  };
}
