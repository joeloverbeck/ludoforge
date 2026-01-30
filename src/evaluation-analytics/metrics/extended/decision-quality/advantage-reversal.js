import { computeScoresAtState } from "../../../../game-kernel/index.js";
import { METRICS_EXTENDED_DEFAULTS } from "../config.js";

const DEFAULTS = METRICS_EXTENDED_DEFAULTS.advantageReversal ?? {
  enabled: false,
};

function resolveEnabled(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(fallback);
}

/**
 * Computes the advantage reversal rate: fraction of simulation steps where the
 * leader changes, averaged across runs. Normalized to [0,1].
 *
 * @param {object} definition - Game definition (DSL)
 * @param {Array} simulations - Array of simulation results with trajectory.steps
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 * @returns {number}
 */
function computeAdvantageReversalRate(definition, simulations, options = {}) {
  const enabled = resolveEnabled(options.enabled, DEFAULTS.enabled);
  if (!enabled) {
    return 0;
  }

  const runs = Array.isArray(simulations) ? simulations : [];
  if (runs.length === 0) {
    return 0;
  }

  const rates = [];

  for (const run of runs) {
    const steps = run?.trajectory?.steps ?? [];
    if (!Array.isArray(steps) || steps.length < 2) {
      continue;
    }

    let previousLeader = null;
    let leaderChanges = 0;
    let validSteps = 0;

    for (const step of steps) {
      const state = step?.state;
      if (!state) {
        continue;
      }

      const scores = computeScoresAtState(definition, state);
      if (!scores || typeof scores !== "object") {
        continue;
      }

      const leader = resolveLeader(scores);
      if (leader === null) {
        continue;
      }

      validSteps += 1;

      if (previousLeader !== null && leader !== previousLeader) {
        leaderChanges += 1;
      }
      previousLeader = leader;
    }

    if (validSteps < 2) {
      continue;
    }

    const rate = leaderChanges / (validSteps - 1);
    rates.push(rate);
  }

  if (rates.length === 0) {
    return 0;
  }

  const average = rates.reduce((sum, v) => sum + v, 0) / rates.length;
  return Math.min(1, Math.max(0, average));
}

/**
 * Determines the leading player from a scores object.
 * Returns player ID (as number) or null if undetermined.
 */
function resolveLeader(scores) {
  let bestPlayer = null;
  let bestScore = -Infinity;

  for (const [playerIdRaw, score] of Object.entries(scores)) {
    const playerId = Number.parseInt(playerIdRaw, 10);
    if (!Number.isInteger(playerId)) {
      continue;
    }
    if (!Number.isFinite(score)) {
      continue;
    }
    if (score > bestScore || (score === bestScore && (bestPlayer === null || playerId < bestPlayer))) {
      bestScore = score;
      bestPlayer = playerId;
    }
  }

  return bestPlayer;
}

export { computeAdvantageReversalRate };
