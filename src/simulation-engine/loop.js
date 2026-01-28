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
  computeScoresAtState,
} from "../game-kernel/index.js";
import { loadConfigFile } from "../config/loader.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultSimulationConfig() {
  const result = await loadConfigFile({ name: "simulation" });
  if (!result.valid) {
    throw new Error(
      `Simulation config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_SIMULATION_CONFIG = await loadDefaultSimulationConfig();

function resolveOptionalNumber(value) {
  return typeof value === "number" ? value : undefined;
}

function resolveSimulationDefaults(config) {
  if (!config || typeof config !== "object") {
    return config;
  }

  const defaults = config.simulationConfig ?? DEFAULT_SIMULATION_CONFIG ?? {};
  const resolved = { ...config };

  const defaultMaxTurns = resolveOptionalNumber(defaults.maxTurns);
  if (resolved.maxTurns == null && defaultMaxTurns != null) {
    resolved.maxTurns = defaultMaxTurns;
  }

  const defaultMaxSteps = resolveOptionalNumber(defaults.maxSteps);
  if (resolved.maxSteps == null && defaultMaxSteps != null) {
    resolved.maxSteps = defaultMaxSteps;
  }

  const defaultSeed =
    defaults?.rng && typeof defaults.rng.seed === "number" ? defaults.rng.seed : undefined;
  if (resolved.seed == null && !resolved.rng && defaultSeed != null) {
    resolved.seed = defaultSeed;
  }

  const defaultLoopDetection = defaults.loopDetection ?? {};
  const defaultLoopMax =
    defaultLoopDetection.enabled === true &&
    typeof defaultLoopDetection.maxRepeatedStates === "number"
      ? defaultLoopDetection.maxRepeatedStates
      : undefined;
  if (defaultLoopMax != null) {
    if (!resolved.loopDetection || typeof resolved.loopDetection !== "object") {
      resolved.loopDetection = { maxRepeatedStates: defaultLoopMax };
    } else if (resolved.loopDetection.maxRepeatedStates == null) {
      resolved.loopDetection = {
        ...resolved.loopDetection,
        maxRepeatedStates: defaultLoopMax,
      };
    }
  }

  const hasDefinitionPolicy = Boolean(resolved.definition?.turn?.noLegalActions);
  const hasOverridePolicy = Boolean(resolved.turn?.noLegalActions);
  const defaultNoLegalActions = defaults.turn?.noLegalActions;
  if (!hasDefinitionPolicy && !hasOverridePolicy && defaultNoLegalActions) {
    resolved.turn = {
      ...resolved.turn,
      noLegalActions: defaultNoLegalActions,
    };
  }

  return resolved;
}

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

function resolveDefaultOutcome(type) {
  if (type === "win") {
    return "lose";
  }
  if (type === "lose") {
    return "win";
  }
  return "draw";
}

function buildTerminationOutcome(definition, state, outcomeDef, activePlayerId, reason) {
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

function buildSimulationOutcome(termination) {
  return {
    outcomes: termination?.outcomes,
    scores: termination?.scores,
  };
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

function createStepImpact() {
  return { affectedPlayerIds: new Set(), affectedGlobal: false };
}

function finalizeStepImpact(impact) {
  const affectedPlayerIds = Array.from(impact?.affectedPlayerIds ?? []).sort((a, b) => a - b);
  return {
    affectedPlayerIds,
    affectedGlobal: impact?.affectedGlobal ?? false,
  };
}

function buildStep(state, actionId, legalActionCount, impact) {
  const impactFields = finalizeStepImpact(impact);
  return {
    turn: state.turn.turn,
    phase: state.turn.phase ?? null,
    playerId: state.turn.currentPlayer ?? null,
    actionId,
    legalActionCount,
    state: cloneState(state),
    ...impactFields,
  };
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
    applyAction(definition, state, action, effectContext);
    applyAfterActionTriggers(definition, state, effectContext);
    recordStateUpdate(events, state, { actionId: action.id, playerId: context.playerId });

    const step = buildStep(state, action.id, legalActionCount, impact);
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
