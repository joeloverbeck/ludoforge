import { loadConfigFile } from "../../../config/loader.js";
import {
  normalizePercent,
  normalizePositiveInt,
  normalizeSeed,
} from "./decision-quality/sampling-utils.js";

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

async function loadDefaultMetricsExtendedConfig() {
  const result = await loadConfigFile({ name: "metrics-extended" });
  if (!result.valid) {
    throw new Error(
      `Metrics extended config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_METRICS_EXTENDED_CONFIG = await loadDefaultMetricsExtendedConfig();

const FALLBACK_DECISION_SAMPLES = 8;
const FALLBACK_ROLLOUTS_PER_ACTION = 8;
const FALLBACK_ROLLOUT_MAX_STEPS = 64;
const FALLBACK_MAX_ROLLOUTS_PER_RUN = 128;
const FALLBACK_ROLLOUT_AGENT = { kind: "random" };
const FALLBACK_EARLY_STEP_PERCENT = 0.25;
const FALLBACK_MATCHES_PER_SEAT = 16;

const meaningfulChoice = DEFAULT_METRICS_EXTENDED_CONFIG?.meaningfulChoice ?? {};
const comebackPotential = DEFAULT_METRICS_EXTENDED_CONFIG?.comebackPotential ?? {};
const skillExpression = DEFAULT_METRICS_EXTENDED_CONFIG?.skillExpression ?? {};
const advantageReversal = DEFAULT_METRICS_EXTENDED_CONFIG?.advantageReversal ?? {};
const policySensitivity = DEFAULT_METRICS_EXTENDED_CONFIG?.policySensitivity ?? {};

const METRICS_EXTENDED_DEFAULTS = {
  meaningfulChoice: {
    enabled: typeof meaningfulChoice.enabled === "boolean" ? meaningfulChoice.enabled : false,
    decisionSamplesPerRun: normalizePositiveInt(
      meaningfulChoice.decisionSamplesPerRun,
      FALLBACK_DECISION_SAMPLES
    ),
    rolloutsPerAction: normalizePositiveInt(
      meaningfulChoice.rolloutsPerAction,
      FALLBACK_ROLLOUTS_PER_ACTION
    ),
    rolloutMaxSteps: normalizePositiveInt(
      meaningfulChoice.rolloutMaxSteps,
      FALLBACK_ROLLOUT_MAX_STEPS
    ),
    maxRolloutsPerRun: normalizePositiveInt(
      meaningfulChoice.maxRolloutsPerRun,
      FALLBACK_MAX_ROLLOUTS_PER_RUN
    ),
    rolloutAgent: meaningfulChoice.rolloutAgent ?? FALLBACK_ROLLOUT_AGENT,
    seed: normalizeSeed(meaningfulChoice.seed),
  },
  comebackPotential: {
    enabled: typeof comebackPotential.enabled === "boolean" ? comebackPotential.enabled : false,
    earlyStepPercent: normalizePercent(
      comebackPotential.earlyStepPercent,
      FALLBACK_EARLY_STEP_PERCENT
    ),
  },
  skillExpression: {
    enabled: typeof skillExpression.enabled === "boolean" ? skillExpression.enabled : false,
    matchesPerSeat: normalizePositiveInt(
      skillExpression.matchesPerSeat,
      FALLBACK_MATCHES_PER_SEAT
    ),
    agentTiers: Array.isArray(skillExpression.agentTiers)
      ? skillExpression.agentTiers.slice()
      : [],
    seed: Number.isInteger(skillExpression.seed) ? skillExpression.seed : null,
    maxTurns: Number.isInteger(skillExpression.maxTurns) ? skillExpression.maxTurns : null,
    maxSteps: Number.isInteger(skillExpression.maxSteps) ? skillExpression.maxSteps : null,
  },
  advantageReversal: {
    enabled: typeof advantageReversal.enabled === "boolean" ? advantageReversal.enabled : false,
  },
  policySensitivity: {
    enabled: typeof policySensitivity.enabled === "boolean" ? policySensitivity.enabled : false,
    matchesPerSeat: normalizePositiveInt(
      policySensitivity.matchesPerSeat,
      FALLBACK_MATCHES_PER_SEAT
    ),
    agentTiers: Array.isArray(policySensitivity.agentTiers)
      ? policySensitivity.agentTiers.slice()
      : [],
    seed: Number.isInteger(policySensitivity.seed) ? policySensitivity.seed : null,
    maxTurns: Number.isInteger(policySensitivity.maxTurns) ? policySensitivity.maxTurns : null,
    maxSteps: Number.isInteger(policySensitivity.maxSteps) ? policySensitivity.maxSteps : null,
  },
};

export { METRICS_EXTENDED_DEFAULTS };
