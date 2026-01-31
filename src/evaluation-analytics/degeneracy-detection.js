import {
  DEFAULT_DEGENERACY_THRESHOLDS,
  DEFAULT_DEGENERACY_FLAGS,
  clampNumber,
} from "./degeneracy-config.js";
import { accumulateStatistics } from "./degeneracy-statistics.js";
import { checkFlags } from "./degeneracy-flags.js";

function detectDegeneracy(summaries, thresholds = {}, options = {}) {
  const resolvedThresholds = {
    loopRepeatRatio: clampNumber(
      thresholds.loopRepeatRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.loopRepeatRatio
    ),
    minRepeatedStates: clampNumber(
      thresholds.minRepeatedStates ?? DEFAULT_DEGENERACY_THRESHOLDS.minRepeatedStates
    ),
    forcedMoveRatio: clampNumber(
      thresholds.forcedMoveRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.forcedMoveRatio
    ),
    dominantActionRatio: clampNumber(
      thresholds.dominantActionRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.dominantActionRatio
    ),
    minActionSamples: clampNumber(
      thresholds.minActionSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minActionSamples
    ),
    trivialWinRate: clampNumber(
      thresholds.trivialWinRate ?? DEFAULT_DEGENERACY_THRESHOLDS.trivialWinRate
    ),
    trivialWinMaxAverageSteps: clampNumber(
      thresholds.trivialWinMaxAverageSteps ??
        DEFAULT_DEGENERACY_THRESHOLDS.trivialWinMaxAverageSteps
    ),
    minTrivialWinSamples: clampNumber(
      thresholds.minTrivialWinSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minTrivialWinSamples
    ),
    minStepsForNoChoices: clampNumber(
      thresholds.minStepsForNoChoices ?? DEFAULT_DEGENERACY_THRESHOLDS.minStepsForNoChoices
    ),
    highSkippedEffectsRate: clampNumber(
      thresholds.highSkippedEffectsRate ?? DEFAULT_DEGENERACY_THRESHOLDS.highSkippedEffectsRate
    ),
    highSkippedEffectsMinAttempts: clampNumber(
      thresholds.highSkippedEffectsMinAttempts ?? DEFAULT_DEGENERACY_THRESHOLDS.highSkippedEffectsMinAttempts
    ),
    anyCostAbortMinCount: clampNumber(
      thresholds.anyCostAbortMinCount ?? DEFAULT_DEGENERACY_THRESHOLDS.anyCostAbortMinCount
    ),
    highSkippedTriggersRate: clampNumber(
      thresholds.highSkippedTriggersRate ?? DEFAULT_DEGENERACY_THRESHOLDS.highSkippedTriggersRate
    ),
    highSkippedTriggersMinAttempts: clampNumber(
      thresholds.highSkippedTriggersMinAttempts ?? DEFAULT_DEGENERACY_THRESHOLDS.highSkippedTriggersMinAttempts
    ),
    highPassRateRate: clampNumber(
      thresholds.highPassRateRate ?? DEFAULT_DEGENERACY_THRESHOLDS.highPassRateRate
    ),
    highPassRateMinSteps: clampNumber(
      thresholds.highPassRateMinSteps ?? DEFAULT_DEGENERACY_THRESHOLDS.highPassRateMinSteps
    ),
    highNoLegalActionsTerminationRate: clampNumber(
      thresholds.highNoLegalActionsTerminationRate ?? DEFAULT_DEGENERACY_THRESHOLDS.highNoLegalActionsTerminationRate
    ),
    highNoLegalActionsTerminationMinRuns: clampNumber(
      thresholds.highNoLegalActionsTerminationMinRuns ?? DEFAULT_DEGENERACY_THRESHOLDS.highNoLegalActionsTerminationMinRuns
    ),
    nonFiniteMetricsMinKeys: clampNumber(
      thresholds.nonFiniteMetricsMinKeys ?? DEFAULT_DEGENERACY_THRESHOLDS.nonFiniteMetricsMinKeys
    ),
  };

  const resolvedOptions = {
    nonFiniteKeys: options.nonFiniteKeys,
  };

  const stats = accumulateStatistics(summaries);
  const { flags, details, ratios } = checkFlags(stats, resolvedThresholds, summaries.length, resolvedOptions);

  const enabledFlags = new Set(DEFAULT_DEGENERACY_FLAGS);
  const filteredFlags = Array.from(flags).filter((flag) => enabledFlags.has(flag));
  const filteredDetails = {};
  for (const flag of filteredFlags) {
    if (Object.prototype.hasOwnProperty.call(details, flag)) {
      filteredDetails[flag] = details[flag];
    }
  }

  return {
    flags: filteredFlags,
    details: Object.keys(filteredDetails).length > 0 ? filteredDetails : undefined,
    ratios: Object.keys(ratios).length > 0 ? ratios : undefined,
  };
}

export { detectDegeneracy };
