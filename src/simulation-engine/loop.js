import {
  createInitialState,
  listLegalActions,
  createEventStream,
  recordStateUpdate,
  evaluateTermination,
} from "../game-kernel/index.js";
import { createSeededRng } from "./rng.js";
import { normalizeAgents } from "./agent-serialization.js";
import { resolveSimulationDefaults } from "./simulation-defaults.js";
import { buildSimulationOutcome } from "./termination-outcome.js";
import { cloneState, applyAction, applyAfterActionTriggers, createStepImpact, buildStep, recordStep } from "./step-execution.js";
import { defaultStateHasher, recordLoopHash } from "./loop-detection.js";
import { advanceAndCheck } from "./turn-advance.js";
import { checkLoopDetection } from "./loop-check.js";
import { selectAndValidateAction } from "./agent-action.js";
import { handleNoLegalActions } from "./no-legal-actions.js";

function buildPlayerOrder(definition) {
  const players = [];
  for (let pid = 1; pid <= definition.players.count; pid += 1) {
    players.push(pid);
  }
  return players;
}

function shufflePlayers(players, rng) {
  const result = players.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng?.nextInt
      ? rng.nextInt(i + 1)
      : Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function resolveSimultaneousOrder(definition, rng) {
  const resolution = definition.turn?.resolution?.order ?? "by_player_id";
  const players = buildPlayerOrder(definition);
  if (resolution === "random") {
    return shufflePlayers(players, rng);
  }
  return players;
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

  if (definition.turn?.scheduler === "simultaneous") {
    return runSimultaneousLoop({
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

    const action = selectAndValidateAction({ agents, definition, state, legalActions, context, rng });

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

    const skippedEffects = actionResult.skippedEffects ?? [];
    const skippedTriggers = triggerResult.skippedTrigger
      ? [triggerResult.skippedTrigger]
      : [];

    const step = buildStep(state, action.id, legalActionCount, impact, {
      stateHash,
      bindings: {},
      appliedEffects,
      skippedEffects,
      skippedTriggers,
    });
    recordStep(step, trajectory, config.stepControl);
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

    const turnCheck = advanceAndCheck(definition, state, { maxTurns, events, trajectory });
    if (turnCheck.done) {
      return turnCheck.result;
    }

    const loopResult = checkLoopDetection(state, tracker, trajectory, definition, events);
    if (loopResult.done) {
      return loopResult.result;
    }
  }
}

function runSimultaneousLoop({
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

      const action = selectAndValidateAction({
        agents,
        definition,
        state,
        legalActions,
        context,
        rng,
      });
      planned.push({ playerId, action, legalActionCount });
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

      const { playerId, action, legalActionCount } = plan;
      state.turn.currentPlayer = playerId;
      const context = {
        playerId,
        phase: state.turn.phase ?? null,
        turn: state.turn.turn,
      };

      const impact = createStepImpact();
      const effectContext = { ...context, impact };
      const actionResult = applyAction(definition, state, action, effectContext);
      const triggerResult = applyAfterActionTriggers(definition, state, effectContext);
      recordStateUpdate(events, state, { actionId: action.id, playerId });

      const stateHash = defaultStateHasher(state);
      const appliedEffects = [
        ...actionResult.appliedEffects,
        ...triggerResult.appliedEffects,
      ];

      const skippedEffects = actionResult.skippedEffects ?? [];
      const skippedTriggers = triggerResult.skippedTrigger
        ? [triggerResult.skippedTrigger]
        : [];

      const step = buildStep(state, action.id, legalActionCount, impact, {
        stateHash,
        bindings: {},
        appliedEffects,
        skippedEffects,
        skippedTriggers,
      });
      recordStep(step, trajectory, config.stepControl);
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
    const turnCheck = advanceAndCheck(definition, state, { maxTurns, events, trajectory });
    if (turnCheck.done) {
      return turnCheck.result;
    }

    const loopResult = checkLoopDetection(state, tracker, trajectory, definition, events);
    if (loopResult.done) {
      return loopResult.result;
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
