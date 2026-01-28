import { computeScoresAtState } from "../../../../game-kernel/index.js";
import { computePearsonCorrelation } from "../math-utils.js";
import { outcomeToScore } from "../outcome-metrics.js";
import { normalizePercent } from "./sampling-utils.js";
import { METRICS_EXTENDED_DEFAULTS } from "../config.js";

const DEFAULTS = METRICS_EXTENDED_DEFAULTS.comebackPotential;

function resolveEnabled(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(fallback);
}

function computeComebackPotential(definition, simulations, options = {}) {
  const config = {
    enabled: resolveEnabled(options.enabled, DEFAULTS.enabled),
    earlyStepPercent: normalizePercent(options.earlyStepPercent, DEFAULTS.earlyStepPercent),
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

export { computeComebackPotential };
