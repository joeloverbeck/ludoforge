import { runRollout } from "../../../../simulation-engine/index.js";
import {
  buildSeed,
  createForcedActionAgent,
  deriveDecisionPoint,
  normalizePositiveInt,
  normalizeSeed,
  resolveOutcomeValue,
  resolveRolloutAgent,
  resolveTerminalState,
  sampleDecisionPoints,
} from "./sampling-utils.js";
import { METRICS_EXTENDED_DEFAULTS } from "../config.js";

const DEFAULTS = METRICS_EXTENDED_DEFAULTS.meaningfulChoice;

function resolveEnabled(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(fallback);
}

function computeMeaningfulChoice(definition, simulations, options = {}) {
  const config = {
    enabled: resolveEnabled(options.enabled, DEFAULTS.enabled),
    decisionSamplesPerRun: normalizePositiveInt(options.decisionSamplesPerRun, DEFAULTS.decisionSamplesPerRun),
    rolloutsPerAction: normalizePositiveInt(options.rolloutsPerAction, DEFAULTS.rolloutsPerAction),
    rolloutMaxSteps: normalizePositiveInt(options.rolloutMaxSteps, DEFAULTS.rolloutMaxSteps),
    maxRolloutsPerRun: normalizePositiveInt(
      options.maxRolloutsPerRun,
      DEFAULTS.maxRolloutsPerRun
    ),
    rolloutAgent: options.rolloutAgent ?? DEFAULTS.rolloutAgent,
    seed: normalizeSeed(options.seed ?? DEFAULTS.seed),
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

export { computeMeaningfulChoice };
