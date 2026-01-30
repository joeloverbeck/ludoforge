/**
 * No-legal-actions policy handlers for the simulation loop.
 * @module simulation-engine/no-legal-actions
 */

import { recordTermination } from "../game-kernel/index.js";
import { defaultStateHasher } from "./loop-detection.js";
import { buildPassStep, recordStep } from "./step-execution.js";
import { buildDrawOutcome, buildTerminationOutcome, buildSimulationOutcome } from "./termination-outcome.js";
import { advanceAndCheck } from "./turn-advance.js";
import { checkLoopDetection } from "./loop-check.js";

/**
 * Handle the case where no legal actions are available.
 *
 * Implements four policies: error, pass, terminate, and the default stalemate.
 *
 * @param {{
 *   config: object,
 *   definition: object,
 *   state: object,
 *   trajectory: object,
 *   events: object,
 *   tracker: object|null,
 *   maxTurns: number|undefined,
 *   stepsTaken: number,
 *   stepControl: object|undefined,
 * }} opts
 * @returns {{ action: "continue", stepsTaken: number } | { action: "return", result: object }}
 */
export function handleNoLegalActions({
  config,
  definition,
  state,
  trajectory,
  events,
  tracker,
  maxTurns,
  stepsTaken,
  stepControl,
}) {
  const noLegalActions = config.turn?.noLegalActions ?? definition.turn?.noLegalActions;
  const policy = noLegalActions?.policy;

  if (policy === "error") {
    const reason = noLegalActions?.reason ?? "no-legal-actions";
    throw new Error(`No legal actions: ${reason}`);
  }

  if (policy === "pass") {
    const passHash = defaultStateHasher(state);
    const step = buildPassStep(state, passHash);
    recordStep(step, trajectory, stepControl);
    const newStepsTaken = stepsTaken + 1;

    const turnCheck = advanceAndCheck(definition, state, { maxTurns, events, trajectory });
    if (turnCheck.done) {
      return { action: "return", result: turnCheck.result };
    }

    const loopResult = checkLoopDetection(state, tracker, trajectory, definition, events);
    if (loopResult.done) {
      return { action: "return", result: loopResult.result };
    }

    return { action: "continue", stepsTaken: newStepsTaken };
  }

  if (policy === "terminate") {
    const detail = noLegalActions?.reason;
    const terminateHash = defaultStateHasher(state);
    const step = buildPassStep(state, terminateHash);
    recordStep(step, trajectory, stepControl);
    const outcome = buildTerminationOutcome(
      definition,
      state,
      noLegalActions?.defaultOutcome,
      state.turn.currentPlayer,
      "no-legal-actions"
    );
    recordTermination(events, outcome);
    return {
      action: "return",
      result: {
        trajectory,
        outcome: buildSimulationOutcome(outcome),
        terminationReason: "no-legal-actions",
        terminationDetail: detail,
        terminated: true,
      },
    };
  }

  // Default: stalemate
  const stalemateHash = defaultStateHasher(state);
  const step = buildPassStep(state, stalemateHash);
  recordStep(step, trajectory, stepControl);
  const outcome = buildDrawOutcome(definition);
  recordTermination(events, outcome);
  return {
    action: "return",
    result: {
      trajectory,
      outcome: buildSimulationOutcome(outcome),
      terminationReason: "stalemate",
      terminated: true,
    },
  };
}
