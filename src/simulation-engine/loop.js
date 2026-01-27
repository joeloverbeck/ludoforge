import {
  createInitialState,
  listLegalActions,
  validateActionChoice,
  advanceTurnPhase,
  applyTriggers,
  applyEffect,
  buildVariableIndex,
  createEventStream,
  recordStateUpdate,
  recordTermination,
  evaluateTermination,
} from "../game-kernel/index.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function defaultStateHasher(state) {
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

function buildDrawOutcome(definition) {
  const outcomes = {};
  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    outcomes[playerId] = "draw";
  }
  return { terminated: true, outcomes };
}

function recordLoopHash(state, tracker) {
  if (!tracker) {
    return { repeated: false };
  }
  const hash = tracker.hasher(state);
  const next = (tracker.counts.get(hash) ?? 0) + 1;
  tracker.counts.set(hash, next);
  if (tracker.maxRepeatedStates != null && next > tracker.maxRepeatedStates) {
    return { repeated: true };
  }
  return { repeated: false };
}

function applyAction(definition, state, action, context) {
  const variableIndex = buildVariableIndex(definition);
  for (const effect of action.costs ?? []) {
    const result = applyEffect(state, effect, { state, ...context, variableIndex });
    if (!result.ok) {
      throw new Error(`Action cost failed: ${result.reason ?? "unknown"}`);
    }
  }
  for (const effect of action.effects ?? []) {
    const result = applyEffect(state, effect, { state, ...context, variableIndex });
    if (!result.ok) {
      throw new Error(`Action effect failed: ${result.reason ?? "unknown"}`);
    }
  }
}

function applyAfterActionTriggers(definition, state, context) {
  const result = applyTriggers(definition, state, "after_action", context);
  if (!result.ok) {
    throw new Error(`After-action triggers failed: ${result.reason ?? "unknown"}`);
  }
}

function buildStep(state, actionId, legalActionCount) {
  return {
    turn: state.turn.turn,
    phase: state.turn.phase ?? null,
    playerId: state.turn.currentPlayer ?? null,
    actionId,
    legalActionCount,
    state: cloneState(state),
  };
}

export function runSimulation(config) {
  const definition = config.definition;
  const agents = normalizeAgents(config.agents ?? []);
  const state = createInitialState(definition);
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

  recordLoopHash(state, tracker);

  while (true) {
    const termination = evaluateTermination(definition, state, {
      activePlayerId: state.turn.currentPlayer,
      events,
    });
    if (termination.terminated) {
      return {
        trajectory,
        outcome: termination,
        terminationReason: "condition",
      };
    }

    const context = {
      playerId: state.turn.currentPlayer,
      phase: state.turn.phase ?? null,
      turn: state.turn.turn,
    };
    const legalActions = listLegalActions(definition, state, context);

    if (legalActions.length === 0) {
      const step = buildStep(state, undefined, 0);
      trajectory.steps.push(step);
      config.stepControl?.onStep?.(step);
      const outcome = buildDrawOutcome(definition);
      recordTermination(events, outcome);
      return {
        trajectory,
        outcome,
        terminationReason: "stalemate",
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

    applyAction(definition, state, action, context);
    applyAfterActionTriggers(definition, state, context);
    recordStateUpdate(events, state, { actionId: action.id, playerId: context.playerId });

    const step = buildStep(state, action.id, legalActions.length);
    trajectory.steps.push(step);
    config.stepControl?.onStep?.(step);

    const postActionTermination = evaluateTermination(definition, state, {
      activePlayerId: state.turn.currentPlayer,
      events,
    });
    if (postActionTermination.terminated) {
      return {
        trajectory,
        outcome: postActionTermination,
        terminationReason: "condition",
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
          outcome: maxTurnOutcome,
          terminationReason: "max-turns",
        };
      }
      if (advanceResult.reason === "state-loop") {
        const outcome = buildDrawOutcome(definition);
        recordTermination(events, outcome);
        return {
          trajectory,
          outcome,
          terminationReason: "loop-detected",
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
        outcome,
        terminationReason: "loop-detected",
      };
    }
  }
}
