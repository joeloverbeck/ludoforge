import { createSeededRng, runBatchSimulations } from "../../simulation-engine/index.js";
import { METRICS_EXTENDED_DEFAULTS } from "./extended/config.js";

const DEFAULT_DRAW_SCORE = 0.5;
const MAX_SEED = 2 ** 32;
const BUILTIN_TIERS = new Set(["random", "greedy"]);
const DEFAULTS = METRICS_EXTENDED_DEFAULTS.skillExpression;

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

async function computeSkillExpressionMetric(definition, options = {}) {
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
  const baseline = tiers[0];
  const advantages = [];

  for (let tierIndex = 1; tierIndex < tiers.length; tierIndex += 1) {
    const tier = tiers[tierIndex];
    for (let seatId = 1; seatId <= playerCount; seatId += 1) {
      const strongAgents = buildAgents(playerCount, baseline, tier, seatId, true);
      const baselineAgents = buildAgents(playerCount, baseline, tier, seatId, false);

      const strongInputs = buildSimulationInputs(
        definition,
        strongAgents,
        matchesPerSeat,
        rng,
        resolvedOptions
      );
      const baselineInputs = buildSimulationInputs(
        definition,
        baselineAgents,
        matchesPerSeat,
        rng,
        resolvedOptions
      );

      const strongResults = await runBatchSimulations(strongInputs);
      const baselineResults = await runBatchSimulations(baselineInputs);

      const strongWinRate = computeWinRate(strongResults.results, seatId);
      const baselineWinRate = computeWinRate(baselineResults.results, seatId);
      if (strongWinRate == null || baselineWinRate == null) {
        continue;
      }
      advantages.push(strongWinRate - baselineWinRate);
    }
  }

  if (advantages.length === 0) {
    return 0;
  }

  const average = advantages.reduce((sum, value) => sum + value, 0) / advantages.length;
  return clamp01(average);
}

export { computeSkillExpressionMetric };
