import { createSeededRng, runBatchSimulations } from "../../../simulation-engine/index.js";
import { METRICS_EXTENDED_DEFAULTS } from "./config.js";

const DEFAULTS = METRICS_EXTENDED_DEFAULTS.policySensitivity ?? {
  enabled: false,
  matchesPerSeat: 16,
  agentTiers: [],
  seed: null,
  maxTurns: null,
  maxSteps: null,
};

const MAX_SEED = 2 ** 32;
const DEFAULT_DRAW_SCORE = 0.5;
const BUILTIN_TIERS = new Set(["random", "greedy"]);

function resolveEnabled(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(fallback);
}

function outcomeToScore(outcome) {
  if (outcome === "win") {
    return 1;
  }
  if (outcome === "lose") {
    return 0;
  }
  return DEFAULT_DRAW_SCORE;
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function normalizeAgentDescriptor(agent) {
  if (!agent) {
    return null;
  }
  if (typeof agent === "string") {
    return { key: `${agent}|null` };
  }
  if (typeof agent === "object") {
    if (typeof agent.selectAction === "function") {
      return null;
    }
    if (typeof agent.kind === "string") {
      const optionsKey = stableStringify(agent.options ?? null);
      return { key: `${agent.kind}|${optionsKey}` };
    }
  }
  return null;
}

function normalizeAgentsForMatch(agents) {
  if (!Array.isArray(agents) || agents.length === 0) {
    return null;
  }
  const normalized = [];
  for (const agent of agents) {
    const entry = normalizeAgentDescriptor(agent);
    if (!entry) {
      return null;
    }
    normalized.push(entry.key);
  }
  return normalized;
}

function findSuiteResults(suiteResults, agents) {
  if (!suiteResults || typeof suiteResults !== "object") {
    return null;
  }
  const expected = normalizeAgentsForMatch(agents);
  if (!expected) {
    return null;
  }
  for (const suiteResult of Object.values(suiteResults)) {
    const suiteAgents = normalizeAgentsForMatch(suiteResult?.agents);
    if (!suiteAgents || suiteAgents.length !== expected.length) {
      continue;
    }
    let matches = true;
    for (let index = 0; index < expected.length; index += 1) {
      if (suiteAgents[index] !== expected[index]) {
        matches = false;
        break;
      }
    }
    if (matches && Array.isArray(suiteResult?.results)) {
      return suiteResult.results;
    }
  }
  return null;
}

function resolveTierAgent(tier) {
  if (!tier) {
    return null;
  }
  if (typeof tier === "string") {
    return BUILTIN_TIERS.has(tier) ? { kind: tier } : null;
  }
  if (typeof tier === "object") {
    if (typeof tier.selectAction === "function") {
      return tier;
    }
    if (typeof tier.kind === "string" && BUILTIN_TIERS.has(tier.kind)) {
      return tier;
    }
  }
  return null;
}

function resolveTierAgents(agentTiers) {
  if (!Array.isArray(agentTiers)) {
    return [];
  }
  return agentTiers.map((tier) => resolveTierAgent(tier)).filter((tier) => tier != null);
}

function buildAgents(playerCount, baseline, tier, seatId, strongInSeat) {
  const agents = new Array(playerCount);
  for (let index = 0; index < playerCount; index += 1) {
    agents[index] = strongInSeat ? baseline : tier;
  }
  agents[seatId - 1] = strongInSeat ? tier : baseline;
  return agents;
}

function buildSimulationInputs(definition, agents, matchCount, rng, options) {
  const inputs = [];
  for (let index = 0; index < matchCount; index += 1) {
    const seed = rng ? rng.nextInt(MAX_SEED) : undefined;
    inputs.push({
      definition,
      agents,
      seed,
      maxTurns: options.maxTurns,
      maxSteps: options.maxSteps,
    });
  }
  return inputs;
}

function computeWinRate(results, seatId) {
  let total = 0;
  let count = 0;
  for (const result of results) {
    const outcome = result?.outcome?.outcomes?.[seatId];
    if (typeof outcome !== "string") {
      continue;
    }
    total += outcomeToScore(outcome);
    count += 1;
  }
  if (count === 0) {
    return null;
  }
  return total / count;
}

/**
 * Computes policy sensitivity: marginal win-rate improvement across a ladder
 * of agent tiers. Uses seat-bias cancellation (same as skill-expression).
 *
 * Returns a value in [0,1]. Higher means stronger players benefit more.
 *
 * @param {object} definition - Game definition (DSL)
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 * @param {number} [options.matchesPerSeat]
 * @param {Array} [options.agentTiers]
 * @param {number|null} [options.seed]
 * @param {number|null} [options.maxTurns]
 * @param {number|null} [options.maxSteps]
 * @returns {number}
 */
function computePolicySensitivity(definition, options = {}) {
  const enabled = resolveEnabled(options.enabled, DEFAULTS.enabled);
  if (!enabled) {
    return 0;
  }

  const playerCount = definition?.players?.count;
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    return 0;
  }

  const resolvedOptions = {
    ...DEFAULTS,
    ...options,
    enabled,
    agentTiers: options.agentTiers ?? DEFAULTS.agentTiers,
    matchesPerSeat:
      Number.isInteger(options.matchesPerSeat) && options.matchesPerSeat > 0
        ? options.matchesPerSeat
        : DEFAULTS.matchesPerSeat,
    seed: Number.isInteger(options.seed) ? options.seed : DEFAULTS.seed,
  };

  const tiers = resolveTierAgents(resolvedOptions.agentTiers);
  if (tiers.length < 2) {
    return 0;
  }

  const matchesPerSeat = resolvedOptions.matchesPerSeat;
  const rng = Number.isInteger(resolvedOptions.seed) ? createSeededRng(resolvedOptions.seed) : null;
  const suiteResults = options?.suiteResults;

  // Compute marginal win-rate deltas across the tier ladder
  const marginals = [];

  for (let tierIndex = 1; tierIndex < tiers.length; tierIndex += 1) {
    const lowerTier = tiers[tierIndex - 1];
    const upperTier = tiers[tierIndex];

    for (let seatId = 1; seatId <= playerCount; seatId += 1) {
      // Upper tier in focal seat vs lower tier opponents
      const strongAgents = buildAgents(playerCount, lowerTier, upperTier, seatId, true);
      // Lower tier in focal seat vs upper tier opponents (seat-bias cancellation)
      const baselineAgents = buildAgents(playerCount, lowerTier, upperTier, seatId, false);

      const strongSuiteResults = findSuiteResults(suiteResults, strongAgents);
      const baselineSuiteResults = findSuiteResults(suiteResults, baselineAgents);

      const strongResults = strongSuiteResults
        ? strongSuiteResults
        : runBatchSimulations(
            buildSimulationInputs(
              definition,
              strongAgents,
              matchesPerSeat,
              rng,
              resolvedOptions
            )
          ).results;
      const baselineResults = baselineSuiteResults
        ? baselineSuiteResults
        : runBatchSimulations(
            buildSimulationInputs(
              definition,
              baselineAgents,
              matchesPerSeat,
              rng,
              resolvedOptions
            )
          ).results;

      const strongWinRate = computeWinRate(strongResults, seatId);
      const baselineWinRate = computeWinRate(baselineResults, seatId);
      if (strongWinRate == null || baselineWinRate == null) {
        continue;
      }
      marginals.push(strongWinRate - baselineWinRate);
    }
  }

  if (marginals.length === 0) {
    return 0;
  }

  const average = marginals.reduce((sum, value) => sum + value, 0) / marginals.length;
  return clamp01(average);
}

export { computePolicySensitivity };
