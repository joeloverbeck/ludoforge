import {
  advanceTurnPhase,
  computeScoresAtState,
  evaluateTermination,
  listLegalActions,
} from "../../game-kernel/index.js";
import {
  createGreedyPolicy,
  createRandomPolicy,
  createSeededRng,
  runRollout,
} from "../../simulation-engine/index.js";

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function computeLengthMean(summaries) {
  const lengths = summaries
    .map((summary) => safeNumber(summary?.stepCount))
    .filter((value) => Number.isFinite(value));
  return average(lengths);
}

function computeLengthVariance(summaries) {
  const lengths = summaries
    .map((summary) => safeNumber(summary?.stepCount))
    .filter((value) => Number.isFinite(value));
  if (lengths.length === 0) {
    return 0;
  }
  const mean = average(lengths);
  const variance =
    lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lengths.length;
  return variance;
}

function computeEarlyTerminationRate(summaries) {
  if (!summaries.length) {
    return 0;
  }
  let earlyCount = 0;
  for (const summary of summaries) {
    const terminationReason = summary?.terminationReason;
    const terminated = summary?.terminalOutcome?.terminated;
    if (terminated === false) {
      earlyCount += 1;
      continue;
    }
    if (typeof terminationReason === "string" && terminationReason !== "condition") {
      earlyCount += 1;
    }
  }
  return earlyCount / summaries.length;
}

const DEFAULT_DRAW_SCORE = 0.5;
const DEFAULT_DECISION_SAMPLES = 8;
const DEFAULT_ROLLOUTS_PER_ACTION = 8;
const DEFAULT_ROLLOUT_MAX_STEPS = 64;
const DEFAULT_MAX_ROLLOUTS_PER_RUN = 128;
const DEFAULT_ROLLOUT_AGENT = { kind: "random" };

function outcomeToScore(outcome) {
  if (outcome === "win") {
    return 1;
  }
  if (outcome === "lose") {
    return 0;
  }
  return DEFAULT_DRAW_SCORE;
}

function computeOutcomeVariance(summaries) {
  const statsByPlayer = new Map();

  for (const summary of summaries) {
    const outcomes = summary?.terminalOutcome?.outcomes;
    if (!outcomes || typeof outcomes !== "object") {
      continue;
    }
    for (const [playerId, outcome] of Object.entries(outcomes)) {
      const score = outcomeToScore(outcome);
      const stats = statsByPlayer.get(playerId) ?? { count: 0, sum: 0, sumSq: 0 };
      stats.count += 1;
      stats.sum += score;
      stats.sumSq += score * score;
      statsByPlayer.set(playerId, stats);
    }
  }

  if (statsByPlayer.size === 0) {
    return 0;
  }

  let totalVariance = 0;
  let playerCount = 0;

  for (const stats of statsByPlayer.values()) {
    if (stats.count <= 0) {
      continue;
    }
    const mean = stats.sum / stats.count;
    const variance = Math.max(0, stats.sumSq / stats.count - mean * mean);
    totalVariance += variance;
    playerCount += 1;
  }

  if (playerCount === 0) {
    return 0;
  }

  return totalVariance / playerCount;
}

function computeCoverageActions(definition, summaries) {
  const actionCount = Array.isArray(definition?.actions) ? definition.actions.length : 0;
  if (actionCount <= 0) {
    return 0;
  }
  const observed = new Set();
  for (const summary of summaries) {
    const actionCounts = summary?.actionCounts;
    if (actionCounts && typeof actionCounts === "object") {
      for (const actionId of Object.keys(actionCounts)) {
        if (typeof actionId === "string" && actionId.length > 0) {
          observed.add(actionId);
        }
      }
    }
    const steps = summary?.keySteps ?? [];
    for (const step of steps) {
      if (typeof step?.actionId === "string" && step.actionId.length > 0) {
        observed.add(step.actionId);
      }
    }
  }
  return Math.min(1, observed.size / actionCount);
}

function computeCoverageState(summaries) {
  const ratios = [];
  for (const summary of summaries) {
    const stepCount = safeNumber(summary?.stepCount);
    const uniqueStateCount = safeNumber(summary?.uniqueStateCount);
    if (stepCount > 0 && Number.isFinite(uniqueStateCount)) {
      ratios.push(Math.min(1, uniqueStateCount / stepCount));
    }
  }
  return average(ratios);
}

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

function computeMeaningfulChoice(definition, simulations, options = {}) {
  const config = {
    enabled: Boolean(options.enabled),
    decisionSamplesPerRun: normalizePositiveInt(
      options.decisionSamplesPerRun,
      DEFAULT_DECISION_SAMPLES
    ),
    rolloutsPerAction: normalizePositiveInt(
      options.rolloutsPerAction,
      DEFAULT_ROLLOUTS_PER_ACTION
    ),
    rolloutMaxSteps: normalizePositiveInt(options.rolloutMaxSteps, DEFAULT_ROLLOUT_MAX_STEPS),
    maxRolloutsPerRun: normalizePositiveInt(
      options.maxRolloutsPerRun,
      DEFAULT_MAX_ROLLOUTS_PER_RUN
    ),
    rolloutAgent: options.rolloutAgent ?? DEFAULT_ROLLOUT_AGENT,
    seed: normalizeSeed(options.seed),
  };

  if (!config.enabled) {
    return 0;
  }

  const runs = Array.isArray(simulations) ? simulations : [];
  if (runs.length === 0) {
    return 0;
  }

  let totalSpread = 0;
  let spreadCount = 0;

  for (let runIndex = 0; runIndex < runs.length; runIndex += 1) {
    const result = runs[runIndex];
    const steps = result?.trajectory?.steps ?? [];
    if (!Array.isArray(steps) || steps.length === 0) {
      continue;
    }
    const decisionPoints = [];
    for (const step of steps) {
      const point = deriveDecisionPoint(definition, step);
      if (point) {
        decisionPoints.push(point);
      }
    }
    if (decisionPoints.length === 0) {
      continue;
    }
    const sampleCount = Math.min(config.decisionSamplesPerRun, decisionPoints.length);
    if (sampleCount <= 0) {
      continue;
    }
    const sampleSeed = buildSeed(config.seed, runIndex, 1);
    const sampledPoints = sampleDecisionPoints(decisionPoints, sampleCount, sampleSeed);
    let rolloutsUsed = 0;

    for (let sampleIndex = 0; sampleIndex < sampledPoints.length; sampleIndex += 1) {
      const point = sampledPoints[sampleIndex];
      const actions = point.legalActions ?? [];
      if (actions.length <= 1) {
        continue;
      }
      const remaining = config.maxRolloutsPerRun - rolloutsUsed;
      if (remaining <= 0) {
        break;
      }
      const perAction = Math.min(
        config.rolloutsPerAction,
        Math.floor(remaining / actions.length)
      );
      if (perAction <= 0) {
        break;
      }

      const actionValues = [];
      for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
        const action = actions[actionIndex];
        let total = 0;
        let count = 0;
        for (let rolloutIndex = 0; rolloutIndex < perAction; rolloutIndex += 1) {
          const rolloutSeed = buildSeed(
            config.seed,
            runIndex,
            sampleIndex,
            actionIndex,
            rolloutIndex
          );
          const fallbackAgent = resolveRolloutAgent(config.rolloutAgent);
          const agent = createForcedActionAgent(action.id, fallbackAgent);
          const rolloutResult = runRollout({
            definition,
            state: point.state,
            agent,
            seed: rolloutSeed,
            maxSteps: config.rolloutMaxSteps,
          });
          const terminalState = resolveTerminalState(rolloutResult, point.state);
          const value = resolveOutcomeValue(
            definition,
            rolloutResult.outcome,
            terminalState,
            point.context.playerId
          );
          total += value;
          count += 1;
        }
        rolloutsUsed += perAction;
        if (count > 0) {
          actionValues.push(total / count);
        }
      }

      if (actionValues.length > 1) {
        totalSpread += Math.max(...actionValues) - Math.min(...actionValues);
        spreadCount += 1;
      }
    }
  }

  if (spreadCount === 0) {
    return 0;
  }

  return totalSpread / spreadCount;
}

function computePearsonCorrelation(valuesA, valuesB) {
  if (!Array.isArray(valuesA) || !Array.isArray(valuesB)) {
    return null;
  }
  if (valuesA.length < 2 || valuesA.length !== valuesB.length) {
    return null;
  }
  const count = valuesA.length;
  const meanA = average(valuesA);
  const meanB = average(valuesB);
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let index = 0; index < count; index += 1) {
    const deltaA = valuesA[index] - meanA;
    const deltaB = valuesB[index] - meanB;
    cov += deltaA * deltaB;
    varA += deltaA * deltaA;
    varB += deltaB * deltaB;
  }
  const denom = Math.sqrt(varA * varB);
  if (!Number.isFinite(denom) || denom <= 0) {
    return null;
  }
  const correlation = cov / denom;
  return Number.isFinite(correlation) ? correlation : null;
}

function computeComebackPotential(definition, simulations, options = {}) {
  const config = {
    enabled: Boolean(options.enabled),
    earlyStepPercent: normalizePercent(options.earlyStepPercent, 0.25),
  };

  if (!config.enabled) {
    return 0;
  }

  const runs = Array.isArray(simulations) ? simulations : [];
  if (runs.length === 0) {
    return 0;
  }

  const advantages = [];
  const outcomeValues = [];

  for (const run of runs) {
    const steps = run?.trajectory?.steps ?? [];
    if (!Array.isArray(steps) || steps.length === 0) {
      continue;
    }
    const stepCount = steps.length;
    const earlyStep = Math.max(1, Math.ceil(stepCount * config.earlyStepPercent));
    const stepIndex = Math.min(stepCount - 1, earlyStep - 1);
    const earlyState = steps[stepIndex]?.state;
    if (!earlyState) {
      continue;
    }
    const scores = computeScoresAtState(definition, earlyState);
    if (!scores || typeof scores !== "object") {
      continue;
    }
    const entries = [];
    for (const [playerIdRaw, score] of Object.entries(scores)) {
      const playerId = Number.parseInt(playerIdRaw, 10);
      if (!Number.isInteger(playerId)) {
        continue;
      }
      if (!Number.isFinite(score)) {
        continue;
      }
      entries.push({ playerId, score });
    }
    if (entries.length < 2) {
      continue;
    }
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.playerId - b.playerId;
    });
    const leader = entries[0];
    const runnerUp = entries[1];
    const advantage = leader.score - runnerUp.score;
    if (!Number.isFinite(advantage)) {
      continue;
    }
    const leaderOutcome = run?.outcome?.outcomes?.[leader.playerId];
    if (typeof leaderOutcome !== "string") {
      continue;
    }
    advantages.push(advantage);
    outcomeValues.push(outcomeToScore(leaderOutcome));
  }

  const correlation = computePearsonCorrelation(advantages, outcomeValues);
  if (correlation == null) {
    return 0;
  }
  const clamped = Math.min(1, Math.max(0, correlation));
  return 1 - clamped;
}

function computeExtendedMetrics(definition, summaries, options = {}) {
  const metrics = [
    { id: "length_mean", value: computeLengthMean(summaries) },
    { id: "length_variance", value: computeLengthVariance(summaries) },
    { id: "early_termination_rate", value: computeEarlyTerminationRate(summaries) },
    { id: "outcome_variance", value: computeOutcomeVariance(summaries) },
    { id: "coverage_actions", value: computeCoverageActions(definition, summaries) },
    { id: "coverage_state", value: computeCoverageState(summaries) },
  ];

  if (options?.meaningfulChoice?.enabled) {
    const value = computeMeaningfulChoice(
      definition,
      options.simulations,
      options.meaningfulChoice
    );
    metrics.push({ id: "choice_value_spread", value });
  }

  if (options?.comebackPotential?.enabled) {
    const value = computeComebackPotential(
      definition,
      options.simulations,
      options.comebackPotential
    );
    metrics.push({ id: "comeback_potential", value });
  }

  return metrics;
}

export {
  computeLengthMean,
  computeLengthVariance,
  computeEarlyTerminationRate,
  computeOutcomeVariance,
  computeCoverageActions,
  computeCoverageState,
  computeMeaningfulChoice,
  computeComebackPotential,
  computeExtendedMetrics,
};
