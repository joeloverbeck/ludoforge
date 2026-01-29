/**
 * Termination and outcome builders for the simulation loop.
 * @module simulation-engine/termination-outcome
 */

import { computeScoresAtState } from "../game-kernel/index.js";

/**
 * Build an all-draw outcome for every player in the definition.
 * @param {object} definition
 * @returns {{ terminated: boolean, outcomes: Record<number,string> }}
 */
export function buildDrawOutcome(definition) {
  const outcomes = {};
  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    outcomes[playerId] = "draw";
  }
  return { terminated: true, outcomes };
}

/**
 * @param {object|undefined} outcome
 * @param {number|undefined} activePlayerId
 * @param {number} playerCount
 * @returns {number[]}
 */
function resolveOutcomePlayers(outcome, activePlayerId, playerCount) {
  if (!outcome?.players || outcome.players === "all") {
    return Array.from({ length: playerCount }, (_, idx) => idx + 1);
  }
  if (outcome.players === "active") {
    if (activePlayerId == null) {
      return Array.from({ length: playerCount }, (_, idx) => idx + 1);
    }
    return [activePlayerId];
  }
  if (Array.isArray(outcome.players)) {
    return outcome.players.filter((id) => Number.isInteger(id));
  }
  return Array.from({ length: playerCount }, (_, idx) => idx + 1);
}

/**
 * @param {string} type
 * @returns {string}
 */
function resolveDefaultOutcome(type) {
  if (type === "win") {
    return "lose";
  }
  if (type === "lose") {
    return "win";
  }
  return "draw";
}

/**
 * Build a full termination outcome with per-player results and scores.
 * @param {object} definition
 * @param {object} state
 * @param {object|undefined} outcomeDef
 * @param {number|undefined} activePlayerId
 * @param {string} reason
 * @returns {{ terminated: boolean, reason: string, outcomes: Record<number,string>, scores: object }}
 */
export function buildTerminationOutcome(definition, state, outcomeDef, activePlayerId, reason) {
  const outcome = outcomeDef ?? { type: "draw", players: "all" };
  const players = resolveOutcomePlayers(outcome, activePlayerId, definition.players.count);
  const outcomes = {};
  const defaultOutcome = resolveDefaultOutcome(outcome.type);

  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    outcomes[playerId] = defaultOutcome;
  }

  for (const playerId of players) {
    if (playerId >= 1 && playerId <= definition.players.count) {
      outcomes[playerId] = outcome.type;
    }
  }

  const scores = computeScoresAtState(definition, state);

  return {
    terminated: true,
    reason,
    outcomes,
    scores,
  };
}

/**
 * Extract the simulation-level outcome fields from a termination result.
 * @param {object|undefined} termination
 * @returns {{ outcomes: object|undefined, scores: object|undefined }}
 */
export function buildSimulationOutcome(termination) {
  return {
    outcomes: termination?.outcomes,
    scores: termination?.scores,
  };
}
