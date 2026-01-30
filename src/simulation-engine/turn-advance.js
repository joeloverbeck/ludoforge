/**
 * Turn advancement with max-turns and state-loop handling.
 * @module simulation-engine/turn-advance
 */

import {
  advanceTurnPhase,
  evaluateTermination,
  recordTermination,
} from "../game-kernel/index.js";
import { buildDrawOutcome, buildSimulationOutcome } from "./termination-outcome.js";

/**
 * Advance the turn/phase and check for max-turns or state-loop errors.
 *
 * @param {object} definition
 * @param {object} state
 * @param {{ maxTurns: number|undefined, events: object, trajectory: object }} opts
 * @returns {{ done: true, result: object } | { done: false }}
 */
export function advanceAndCheck(definition, state, { maxTurns, events, trajectory, rng }) {
  const advanceResult = advanceTurnPhase(definition, state, {
    maxTurns,
    stateHistoryLimit: 0,
    rng,
  });

  if (advanceResult.ok) {
    return { done: false };
  }

  if (advanceResult.reason === "max-turns") {
    const maxTurnOutcome = evaluateTermination(definition, state, {
      activePlayerId: state.turn.currentPlayer,
      maxTurnsReached: true,
      events,
    });
    return {
      done: true,
      result: {
        trajectory,
        outcome: buildSimulationOutcome(maxTurnOutcome),
        terminationReason: "max-turns",
        terminated: false,
      },
    };
  }

  if (advanceResult.reason === "state-loop") {
    const outcome = buildDrawOutcome(definition);
    recordTermination(events, outcome);
    return {
      done: true,
      result: {
        trajectory,
        outcome: buildSimulationOutcome(outcome),
        terminationReason: "loop-detected",
        terminated: false,
      },
    };
  }

  throw new Error(`Scheduler failed: ${advanceResult.reason ?? "unknown"}`);
}
