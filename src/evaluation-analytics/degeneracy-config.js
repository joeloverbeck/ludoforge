import { loadConfigFile } from "../config/loader.js";

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

async function loadDefaultDegeneracyConfig() {
  const result = await loadConfigFile({ name: "degeneracy" });
  if (!result.valid) {
    throw new Error(
      `Degeneracy config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_DEGENERACY_CONFIG = await loadDefaultDegeneracyConfig();

function clampNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

const FALLBACK_DEGENERACY_THRESHOLDS = {
  loopRepeatRatio: 0.25,
  minRepeatedStates: 1,
  forcedMoveRatio: 0.8,
  dominantActionRatio: 0.8,
  minActionSamples: 10,
  trivialWinRate: 0.9,
  trivialWinMaxAverageSteps: 3,
  minTrivialWinSamples: 3,
  minStepsForNoChoices: 10,
  highSkippedEffectsRate: 0.10,
  highSkippedEffectsMinAttempts: 50,
  anyCostAbortMinCount: 1,
  highSkippedTriggersRate: 0.10,
  highSkippedTriggersMinAttempts: 20,
  highPassRateRate: 0.30,
  highPassRateMinSteps: 20,
  highNoLegalActionsTerminationRate: 0.25,
  highNoLegalActionsTerminationMinRuns: 10,
  nonFiniteMetricsMinKeys: 1,
};

const FALLBACK_DEGENERACY_FLAGS = [
  "loop",
  "stalemate",
  "forced-move",
  "dominant-action",
  "trivial-win",
  "no-choices",
  "non-terminating",
  "high-skipped-effects",
  "any-cost-abort",
  "high-skipped-triggers",
  "high-pass-rate",
  "high-no-legal-actions-termination",
  "non-finite-metrics",
];

function resolveFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

const DEFAULT_DEGENERACY_THRESHOLDS = {
  loopRepeatRatio: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.loop?.repeatedStateRatio,
    FALLBACK_DEGENERACY_THRESHOLDS.loopRepeatRatio
  ),
  minRepeatedStates: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.loop?.minRepeatedStates,
    FALLBACK_DEGENERACY_THRESHOLDS.minRepeatedStates
  ),
  forcedMoveRatio: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.forcedMove?.ratio,
    FALLBACK_DEGENERACY_THRESHOLDS.forcedMoveRatio
  ),
  dominantActionRatio: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.dominantAction?.ratio,
    FALLBACK_DEGENERACY_THRESHOLDS.dominantActionRatio
  ),
  minActionSamples: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.dominantAction?.minSamples,
    FALLBACK_DEGENERACY_THRESHOLDS.minActionSamples
  ),
  trivialWinRate: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.trivialWin?.winRate,
    FALLBACK_DEGENERACY_THRESHOLDS.trivialWinRate
  ),
  trivialWinMaxAverageSteps: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.trivialWin?.maxAvgSteps,
    FALLBACK_DEGENERACY_THRESHOLDS.trivialWinMaxAverageSteps
  ),
  minTrivialWinSamples: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.trivialWin?.minSamples,
    FALLBACK_DEGENERACY_THRESHOLDS.minTrivialWinSamples
  ),
  minStepsForNoChoices: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.minStepsForNoChoices,
    FALLBACK_DEGENERACY_THRESHOLDS.minStepsForNoChoices
  ),
  highSkippedEffectsRate: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highSkippedEffects?.rate,
    FALLBACK_DEGENERACY_THRESHOLDS.highSkippedEffectsRate
  ),
  highSkippedEffectsMinAttempts: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highSkippedEffects?.minAttempts,
    FALLBACK_DEGENERACY_THRESHOLDS.highSkippedEffectsMinAttempts
  ),
  anyCostAbortMinCount: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.anyCostAbort?.minCount,
    FALLBACK_DEGENERACY_THRESHOLDS.anyCostAbortMinCount
  ),
  highSkippedTriggersRate: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highSkippedTriggers?.rate,
    FALLBACK_DEGENERACY_THRESHOLDS.highSkippedTriggersRate
  ),
  highSkippedTriggersMinAttempts: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highSkippedTriggers?.minAttempts,
    FALLBACK_DEGENERACY_THRESHOLDS.highSkippedTriggersMinAttempts
  ),
  highPassRateRate: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highPassRate?.rate,
    FALLBACK_DEGENERACY_THRESHOLDS.highPassRateRate
  ),
  highPassRateMinSteps: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highPassRate?.minSteps,
    FALLBACK_DEGENERACY_THRESHOLDS.highPassRateMinSteps
  ),
  highNoLegalActionsTerminationRate: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highNoLegalActionsTermination?.rate,
    FALLBACK_DEGENERACY_THRESHOLDS.highNoLegalActionsTerminationRate
  ),
  highNoLegalActionsTerminationMinRuns: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.highNoLegalActionsTermination?.minRuns,
    FALLBACK_DEGENERACY_THRESHOLDS.highNoLegalActionsTerminationMinRuns
  ),
  nonFiniteMetricsMinKeys: resolveFiniteNumber(
    DEFAULT_DEGENERACY_CONFIG?.thresholds?.nonFiniteMetrics?.minKeys,
    FALLBACK_DEGENERACY_THRESHOLDS.nonFiniteMetricsMinKeys
  ),
};

const DEFAULT_DEGENERACY_FLAGS = Array.isArray(DEFAULT_DEGENERACY_CONFIG?.enabledFlags)
  ? DEFAULT_DEGENERACY_CONFIG.enabledFlags.slice()
  : FALLBACK_DEGENERACY_FLAGS;

function deriveRejectFlags(policyByFlag) {
  if (policyByFlag && typeof policyByFlag === "object") {
    return Object.entries(policyByFlag)
      .filter(([, policy]) => policy === "reject")
      .map(([flag]) => flag);
  }
  return FALLBACK_DEGENERACY_FLAGS;
}

const DEFAULT_DEGENERACY_FILTERS = {
  rejectFlags: deriveRejectFlags(DEFAULT_DEGENERACY_CONFIG?.policyByFlag),
};

export {
  DEFAULT_DEGENERACY_CONFIG,
  DEFAULT_DEGENERACY_THRESHOLDS,
  DEFAULT_DEGENERACY_FLAGS,
  DEFAULT_DEGENERACY_FILTERS,
  clampNumber,
};
