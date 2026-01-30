/**
 * Loop detection check for the simulation loop.
 * @module simulation-engine/loop-check
 */

import { recordTermination } from "../game-kernel/index.js";
import { recordLoopHash } from "./loop-detection.js";
import { buildDrawOutcome, buildSimulationOutcome } from "./termination-outcome.js";

/**
 * Record state hash and return early if a repeated state is detected.
 *
 * @param {object} state
 * @param {object|null} tracker
 * @param {object} trajectory
 * @param {object} definition
 * @param {object} events
 * @returns {{ done: true, result: object } | { done: false }}
 */
export function checkLoopDetection(state, tracker, trajectory, definition, events) {
  const loopCheck = recordLoopHash(state, tracker);
  if (loopCheck.repeated) {
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
  return { done: false };
}
