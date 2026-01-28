import {
  advanceTurnPhase,
  computeScoresAtState,
  evaluateTermination,
  listLegalActions,
} from "../../../../game-kernel/index.js";
import {
  createGreedyPolicy,
  createRandomPolicy,
  createSeededRng,
} from "../../../../simulation-engine/index.js";
import { safeNumber } from "../math-utils.js";
import { outcomeToScore } from "../outcome-metrics.js";

function normalizePositiveInt(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizePercent(value, fallback) {
  if (Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return fallback;
}

function normalizeSeed(value) {
  return Number.isInteger(value) ? value >>> 0 : 0;
}

function buildSeed(baseSeed, ...parts) {
  let seed = normalizeSeed(baseSeed);
  for (const part of parts) {
    const next = Number.isInteger(part) ? part >>> 0 : 0;
    seed = (seed * 1664525 + next + 1013904223) >>> 0;
  }
  return seed;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function resolveRolloutAgent(agent) {
  if (agent && typeof agent.selectAction === "function") {
    return agent;
  }
  if (agent && typeof agent === "object" && agent.kind === "greedy") {
    return createGreedyPolicy(agent.options);
  }
  if (agent && typeof agent === "object" && agent.kind === "random") {
    return createRandomPolicy();
  }
  return createRandomPolicy();
}

function createForcedActionAgent(actionId, fallbackAgent) {
  let used = false;
  return {
    selectAction(input) {
      if (!used) {
        used = true;
        return actionId;
      }
      return fallbackAgent.selectAction(input);
    },
  };
}

function resolveTerminalState(result, fallbackState) {
  const steps = result?.trajectory?.steps ?? [];
  if (steps.length > 0) {
    const last = steps[steps.length - 1];
    if (last?.state) {
      return last.state;
    }
  }
  return fallbackState;
}

function resolveOutcomeValue(definition, outcome, terminalState, playerId) {
  const scores = outcome?.scores ?? computeScoresAtState(definition, terminalState);
  if (scores && Object.prototype.hasOwnProperty.call(scores, playerId)) {
    return safeNumber(scores[playerId]);
  }
  return outcomeToScore(outcome?.outcomes?.[playerId]);
}

function deriveDecisionPoint(definition, step) {
  if (!step?.state || !step.state.turn) {
    return null;
  }
  const state = cloneState(step.state);
  const activePlayerId = state.turn.currentPlayer ?? step.playerId ?? null;
  const postActionTermination = evaluateTermination(definition, state, { activePlayerId });
  if (postActionTermination.terminated) {
    return null;
  }
  const advance = advanceTurnPhase(definition, state, { stateHistoryLimit: 0 });
  if (!advance.ok) {
    return null;
  }
  const decisionTermination = evaluateTermination(definition, state, {
    activePlayerId: state.turn.currentPlayer,
  });
  if (decisionTermination.terminated) {
    return null;
  }
  const context = {
    playerId: state.turn.currentPlayer,
    phase: state.turn.phase ?? null,
    turn: state.turn.turn,
  };
  const legalActions = listLegalActions(definition, state, context);
  if (legalActions.length <= 1) {
    return null;
  }
  return { state, context, legalActions };
}

function sampleDecisionPoints(points, count, seed) {
  if (points.length <= count) {
    return points.slice(0, count);
  }
  const rng = createSeededRng(seed);
  const selected = new Set();
  const samples = [];
  while (samples.length < count && selected.size < points.length) {
    const index = rng.nextInt(points.length);
    if (selected.has(index)) {
      continue;
    }
    selected.add(index);
    samples.push(points[index]);
  }
  return samples;
}

export {
  buildSeed,
  cloneState,
  createForcedActionAgent,
  deriveDecisionPoint,
  normalizePercent,
  normalizePositiveInt,
  normalizeSeed,
  resolveOutcomeValue,
  resolveRolloutAgent,
  resolveTerminalState,
  sampleDecisionPoints,
};
