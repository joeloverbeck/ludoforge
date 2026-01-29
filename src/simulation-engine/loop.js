import {
  createInitialState,
  listLegalActions,
  validateActionChoice,
  advanceTurnPhase,
  createEventStream,
  recordStateUpdate,
  recordTermination,
  evaluateTermination,
} from "../game-kernel/index.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";
import { resolveSimulationDefaults } from "./simulation-defaults.js";
import { buildDrawOutcome, buildTerminationOutcome, buildSimulationOutcome } from "./termination-outcome.js";
import { cloneState, applyAction, applyAfterActionTriggers, createStepImpact, buildStep } from "./step-execution.js";
import { defaultStateHasher, recordLoopHash } from "./loop-detection.js";

function resolveAgent(agents, state) {
  const playerId = state.turn.currentPlayer;
  const agentById = agents.find((agent) => agent.id === playerId);
  if (agentById) {
    return agentById;
  }
  const role = state.agents.find((agent) => agent.id === playerId)?.role;
  if (role) {
    const agentByRole = agents.find((agent) => agent.role === role);
    if (agentByRole) {
      return agentByRole;
    }
  }
  return agents[playerId - 1] ?? agents[0];
}

function runSimulationLoop(config) {
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
    const legalActionCount = legalActions.length;
    const meta = {
      legalActionCount,
      hasLegalActions: legalActionCount > 0,
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
      const noLegalActions = config.turn?.noLegalActions ?? definition.turn?.noLegalActions;
      const policy = noLegalActions?.policy;

      if (policy === "error") {
        const reason = noLegalActions?.reason ?? "no-legal-actions";
        throw new Error(`No legal actions: ${reason}`);
      }

      if (policy === "pass") {
        const step = buildStep(state, null, 0);
        trajectory.steps.push(step);
        config.stepControl?.onStep?.(step);
        stepsTaken += 1;

        const advanceResult = advanceTurnPhase(definition, state, {
          maxTurns,
          stateHistoryLimit: 0,
        });
        if (!advanceResult.ok) {
          if (advanceResult.reason === "max-turns") {
            const maxTurnOutcome = evaluateTermination(definition, state, {
              activePlayerId: state.turn.currentPlayer,
              maxTurnsReached: true,
              events,
            });
            return {
              trajectory,
              outcome: buildSimulationOutcome(maxTurnOutcome),
              terminationReason: "max-turns",
              terminated: false,
            };
          }
          if (advanceResult.reason === "state-loop") {
            const outcome = buildDrawOutcome(definition);
            recordTermination(events, outcome);
            return {
              trajectory,
              outcome: buildSimulationOutcome(outcome),
              terminationReason: "loop-detected",
              terminated: false,
            };
          }
          throw new Error(`Scheduler failed: ${advanceResult.reason ?? "unknown"}`);
        }

        const loopCheck = recordLoopHash(state, tracker);
        if (loopCheck.repeated) {
          const outcome = buildDrawOutcome(definition);
          recordTermination(events, outcome);
          return {
            trajectory,
            outcome: buildSimulationOutcome(outcome),
            terminationReason: "loop-detected",
            terminated: false,
          };
        }

        continue;
      }

      if (policy === "terminate") {
        const detail = noLegalActions?.reason;
        const step = buildStep(state, undefined, 0);
        trajectory.steps.push(step);
        config.stepControl?.onStep?.(step);
        stepsTaken += 1;
        const outcome = buildTerminationOutcome(
          definition,
          state,
          noLegalActions?.defaultOutcome,
          state.turn.currentPlayer,
          "no-legal-actions"
        );
        recordTermination(events, outcome);
        return {
          trajectory,
          outcome: buildSimulationOutcome(outcome),
          terminationReason: "no-legal-actions",
          terminationDetail: detail,
          terminated: true,
        };
      }

      const step = buildStep(state, undefined, 0);
      trajectory.steps.push(step);
      config.stepControl?.onStep?.(step);
      const outcome = buildDrawOutcome(definition);
      recordTermination(events, outcome);
      return {
        trajectory,
        outcome: buildSimulationOutcome(outcome),
        terminationReason: "stalemate",
        terminated: true,
      };
    }

    const agent = resolveAgent(agents, state);
    if (!agent || typeof agent.selectAction !== "function") {
      throw new Error("No agent available to select an action.");
    }

    const selection = agent.selectAction({
      definition,
      state,
      legalActions,
      context,
      rng,
    });
    const action =
      typeof selection === "string"
        ? definition.actions.find((candidate) => candidate.id === selection)
        : selection;
    if (!action) {
      throw new Error("Agent selected an unknown action.");
    }
    const isLegal = legalActions.some((candidate) => candidate.id === action.id);
    if (!isLegal) {
      throw new Error(`Agent selected illegal action: ${action.id}`);
    }
    const validation = validateActionChoice(definition, state, action.id, context);
    if (!validation.ok) {
      throw new Error(`Agent selected invalid action: ${validation.reason ?? "unknown"}`);
    }

    const impact = createStepImpact();
    const effectContext = { ...context, impact };
    const actionResult = applyAction(definition, state, action, effectContext);
    const triggerResult = applyAfterActionTriggers(definition, state, effectContext);
    recordStateUpdate(events, state, { actionId: action.id, playerId: context.playerId });

    const stateHash = defaultStateHasher(state);
    const appliedEffects = [
      ...actionResult.appliedEffects,
      ...triggerResult.appliedEffects,
    ];

    const step = buildStep(state, action.id, legalActionCount, impact, {
      stateHash,
      bindings: {},
      appliedEffects,
    });
    trajectory.steps.push(step);
    config.stepControl?.onStep?.(step);
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

    const advanceResult = advanceTurnPhase(definition, state, {
      maxTurns,
      stateHistoryLimit: 0,
    });
    if (!advanceResult.ok) {
      if (advanceResult.reason === "max-turns") {
        const maxTurnOutcome = evaluateTermination(definition, state, {
          activePlayerId: state.turn.currentPlayer,
          maxTurnsReached: true,
          events,
        });
        return {
          trajectory,
          outcome: buildSimulationOutcome(maxTurnOutcome),
          terminationReason: "max-turns",
          terminated: false,
        };
      }
      if (advanceResult.reason === "state-loop") {
        const outcome = buildDrawOutcome(definition);
        recordTermination(events, outcome);
        return {
          trajectory,
          outcome: buildSimulationOutcome(outcome),
          terminationReason: "loop-detected",
          terminated: false,
        };
      }
      throw new Error(`Scheduler failed: ${advanceResult.reason ?? "unknown"}`);
    }

    const loopCheck = recordLoopHash(state, tracker);
    if (loopCheck.repeated) {
      const outcome = buildDrawOutcome(definition);
      recordTermination(events, outcome);
      return {
        trajectory,
        outcome: buildSimulationOutcome(outcome),
        terminationReason: "loop-detected",
        terminated: false,
      };
    }
  }
}

export function runSimulation(config) {
  const resolved = resolveSimulationDefaults(config);
  const definition = resolved.definition;
  const agents = normalizeAgents(resolved.agents ?? []);
  const state = createInitialState(definition);

  return runSimulationLoop({ ...resolved, definition, agents, state });
}

export function runRollout(config) {
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

  return runSimulationLoop({
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
