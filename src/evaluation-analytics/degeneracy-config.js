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
};

const FALLBACK_DEGENERACY_FLAGS = [
  "loop",
  "stalemate",
  "forced-move",
  "dominant-action",
  "trivial-win",
  "no-choices",
  "non-terminating",
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
