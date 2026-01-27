export type {
  CompositeScore,
  DegeneracyFlag,
  DegeneracyReport,
  EvaluationAnalyticsInput,
  EvaluationAnalyticsOutput,
  FeatureVector,
  MetricId,
  MetricResult,
  MetricResults,
  PreferenceFeedbackComparison,
  PreferenceFeedbackRating,
  PreferenceFeedbackSample,
  PreferenceModelUpdate,
  PreferenceModelState,
  SimulationLog,
  SimulationLogMetadata,
  TrajectorySummary,
} from "./types.js";

export type {
  LogAdapterErrorCode,
  LogAdapterFailure,
  LogAdapterInput,
  LogAdapterResult,
  LogAdapterSuccess,
} from "./log-adapter.js";

export {
  DEFAULT_DEGENERACY_FILTERS,
  DEFAULT_DEGENERACY_THRESHOLDS,
  applyDegeneracyFilters,
  detectDegeneracy,
} from "./degeneracy.js";

export {
  computeAgency,
  computeCoreMetrics,
  computeInteractionRate,
  computePacingTension,
  computeSkillExpression,
  computeStrategicDepth,
  computeVariety,
} from "./metrics/core.js";

export {
  computeBalanceSkew,
  computeCoverageActions,
  computeCoverageState,
  computeEarlyTerminationRate,
  computeExtendedMetrics,
  computeLengthMean,
  computeLengthVariance,
} from "./metrics/extended.js";

export {
  DEFAULT_DEGENERACY_ORDER,
  DEFAULT_FEATURE_ORDER,
  assembleFeatureVector,
} from "./feature-vector.js";

export { computeCompositeScore, computeObjectiveScores } from "./scoring.js";

export { createPreferenceModelState, updatePreferenceModelState } from "./preference-model.js";
