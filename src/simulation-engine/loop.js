import {
  createInitialState,
  listLegalActions,
  createEventStream,
  evaluateTermination,
} from "../game-kernel/index.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";
import { resolveSimulationDefaults } from "./simulation-defaults.js";
import { buildSimulationOutcome } from "./termination-outcome.js";
import { cloneState } from "./step-execution.js";
import { defaultStateHasher, recordLoopHash } from "./loop-detection.js";
import { executeActionStep } from "./execute-action-step.js";
import { advanceAndCheck } from "./turn-advance.js";
import { checkLoopDetection } from "./loop-check.js";
import { selectAndValidateAction } from "./agent-action.js";
import { handleNoLegalActions } from "./no-legal-actions.js";
import { runSimultaneousLoop } from "./simultaneous-loop.js";
import { computeDecisionSpace } from "./decision-space.js";

async function runSimulationLoop(config) {
  const definition = config.definition;
  const agents = config.agents ?? [];
  const state = config.state ?? createInitialState(definition);
  const rng =
    config.rng ?? (typeof config.seed === "number" ? createSeededRng(config.seed) : undefined);
  const events = createEventStream();
  const trajectory = { steps: [], events };
  const loopDetection = config.loopDetection ?? {};
  const tracker =
    typeof loopDetection.maxRepeatedStates === "number"
      ? {
          maxRepeatedStates: loopDetection.maxRepeatedStates,
          hasher: loopDetection.stateHasher ?? defaultStateHasher,
          counts: new Map(),
        }
      : null;
  const maxTurns = typeof config.maxTurns === "number" ? config.maxTurns : undefined;
  const maxSteps = typeof config.maxSteps === "number" ? config.maxSteps : undefined;
  let stepsTaken = 0;

  recordLoopHash(state, tracker);

  if (definition.turn?.scheduler === "simultaneous") {
    return await runSimultaneousLoop({
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
    });
  }

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

    const context = {
      playerId: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
      turn: state.turn.turn,
    };
    const legalActions = listLegalActions(definition, state, context);
    const decisionSpace = legalActions.length > 0
      ? computeDecisionSpace(definition, state, legalActions, context, config)
      : { legalActionCount: 0, decisionSpaceRaw: 0, decisionSpaceCapped: false };
    const legalActionCount = decisionSpace.legalActionCount;
    const meta = {
      legalActionCount,
      hasLegalActions: legalActions.length > 0,
    };

    const termination = evaluateTermination(definition, state, {
      activePlayerId: state.turn.currentPlayer,
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
      continue;
    }

    const selectionResult = await selectAndValidateAction({ agents, definition, state, legalActions, context, rng });
    if (selectionResult == null) {
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
      continue;
    }
    const { action, args } = selectionResult;

    executeActionStep({
      definition, state, action, context, legalActionCount,
      rng, events, trajectory, stepControl: config.stepControl,
      args,
      decisionSpaceRaw: decisionSpace.decisionSpaceRaw,
      decisionSpaceCapped: decisionSpace.decisionSpaceCapped,
    });
    stepsTaken += 1;

    const postActionTermination = evaluateTermination(definition, state, {
      activePlayerId: state.turn.currentPlayer,
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

export async function runSimulation(config) {
  const resolved = resolveSimulationDefaults(config);
  const definition = resolved.definition;
  const agents = normalizeAgents(resolved.agents ?? []);
  const state = createInitialState(definition);

  return await runSimulationLoop({ ...resolved, definition, agents, state });
}

export async function runRollout(config) {
  if (!config || !config.definition) {
    throw new Error("runRollout requires a game definition.");
  }
  if (!config.state) {
    throw new Error("runRollout requires a starting state.");
  }
  if (!config.agent) {
    throw new Error("runRollout requires an agent.");
  }
  const definition = config.definition;
  const agentInput = config.agent != null ? [config.agent] : [];
  const agents = normalizeAgents(agentInput);
  const state = cloneState(config.state);
  const resolved = resolveSimulationDefaults({ ...config, definition });

  return await runSimulationLoop({
    definition,
    agents,
    state,
    seed: resolved.seed,
    rng: resolved.rng,
    loopDetection: resolved.loopDetection,
    maxSteps: resolved.maxSteps,
    turn: resolved.turn,
  });
}
