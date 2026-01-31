/**
 * Simultaneous-scheduler simulation loop.
 * @module simulation-engine/simultaneous-loop
 */

import { listLegalActions, evaluateTermination } from "../game-kernel/index.js";
import { buildSimulationOutcome } from "./termination-outcome.js";
import { advanceAndCheck } from "./turn-advance.js";
import { checkLoopDetection } from "./loop-check.js";
import { selectAndValidateAction } from "./agent-action.js";
import { handleNoLegalActions } from "./no-legal-actions.js";
import { buildPlayerOrder, resolveSimultaneousOrder } from "./simultaneous-order.js";
import { executeActionStep } from "./execute-action-step.js";

export async function runSimultaneousLoop({
  config,
  definition,
  agents,
  state,
  rng,
  events,
  trajectory,
  tracker,
  maxTurns,
  maxSteps,
  stepsTaken,
}) {
  const planningOrder = buildPlayerOrder(definition);

  while (true) {
    if (typeof maxSteps === "number" && stepsTaken >= maxSteps) {
      const maxStepOutcome = evaluateTermination(definition, state, {
        activePlayerId: state.turn.currentPlayer,
        maxTurnsReached: true,
        events,
      });
      return {
        trajectory,
        outcome: buildSimulationOutcome(maxStepOutcome),
        terminationReason: "max-steps",
        terminated: false,
      };
    }

    state.turn.currentPlayer = 1;
    const phase = state.turn.phase ?? null;
    const turn = state.turn.turn;
    const planned = [];
    let aborted = false;

    for (const playerId of planningOrder) {
      state.turn.currentPlayer = playerId;
      const context = { playerId, phase, turn };
      const legalActions = listLegalActions(definition, state, context);
      const legalActionCount = legalActions.length;
      const meta = {
        legalActionCount,
        hasLegalActions: legalActionCount > 0,
      };

      const termination = evaluateTermination(definition, state, {
        activePlayerId: playerId,
        events,
        meta,
      });
      if (termination.terminated) {
        return {
          trajectory,
          outcome: buildSimulationOutcome(termination),
          terminationReason: "condition",
          terminated: true,
        };
      }

      if (legalActionCount === 0) {
        const noLegalResult = handleNoLegalActions({
          config,
          definition,
          state,
          trajectory,
          events,
          tracker,
          maxTurns,
          stepsTaken,
          stepControl: config.stepControl,
        });
        if (noLegalResult.action === "return") {
          return noLegalResult.result;
        }
        stepsTaken = noLegalResult.stepsTaken;
        aborted = true;
        break;
      }

      const { action, args } = await selectAndValidateAction({
        agents,
        definition,
        state,
        legalActions,
        context,
        rng,
      });
      planned.push({ playerId, action, args, legalActionCount });
    }

    if (aborted) {
      continue;
    }

    const resolutionOrder = resolveSimultaneousOrder(definition, rng);
    const plannedByPlayer = new Map(planned.map((entry) => [entry.playerId, entry]));
    const orderedPlans = resolutionOrder
      .map((pid) => plannedByPlayer.get(pid))
      .filter(Boolean);

    for (const plan of orderedPlans) {
      if (typeof maxSteps === "number" && stepsTaken >= maxSteps) {
        const maxStepOutcome = evaluateTermination(definition, state, {
          activePlayerId: state.turn.currentPlayer,
          maxTurnsReached: true,
          events,
        });
        return {
          trajectory,
          outcome: buildSimulationOutcome(maxStepOutcome),
          terminationReason: "max-steps",
          terminated: false,
        };
      }

      const { playerId, action, args, legalActionCount } = plan;
      state.turn.currentPlayer = playerId;
      const context = {
        playerId,
        phase: state.turn.phase ?? null,
        turn: state.turn.turn,
      };

      executeActionStep({
        definition, state, action, context, legalActionCount,
        rng, events, trajectory, stepControl: config.stepControl,
        args,
      });
      stepsTaken += 1;

      const postActionTermination = evaluateTermination(definition, state, {
        activePlayerId: playerId,
        events,
      });
      if (postActionTermination.terminated) {
        return {
          trajectory,
          outcome: buildSimulationOutcome(postActionTermination),
          terminationReason: "condition",
          terminated: true,
        };
      }
    }

    state.turn.currentPlayer = 1;
    const turnCheck = advanceAndCheck(definition, state, { maxTurns, events, trajectory, rng });
    if (turnCheck.done) {
      return turnCheck.result;
    }

    const loopResult = checkLoopDetection(state, tracker, trajectory, definition, events);
    if (loopResult.done) {
      return loopResult.result;
    }
  }
}
