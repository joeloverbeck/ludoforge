export type {
  ActiveLearningCandidate,
  ActiveLearningPair,
  ActiveLearningSelectionOptions,
  CompositeScore,
  DegeneracyFlag,
  DegeneracyReport,
  DecisionQualitySamplingConfig,
  EvaluationAnalyticsInput,
  EvaluationAnalyticsOutput,
  ExtendedMetricsOptions,
  FeatureVector,
  MetricId,
  MetricResult,
  MetricResults,
  PreferenceFeedbackComparison,
  PreferenceFeedbackRating,
  PreferenceFeedbackSample,
  PreferenceCalibrationBucket,
  PreferenceModelUpdate,
  PreferenceMetrics,
  PreferenceScore,
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
  computeComebackPotential,
  computeCoverageActions,
  computeCoverageState,
  computeEarlyTerminationRate,
  computeExtendedMetrics,
  computeLengthMean,
  computeLengthVariance,
  computeMeaningfulChoice,
  computeOutcomeVariance,
} from "./metrics/extended.js";

export {
  DEFAULT_DEGENERACY_ORDER,
  DEFAULT_FEATURE_ORDER,
  assembleFeatureVector,
} from "./feature-vector.js";

export { combineFitnessScores, computeCompositeScore, computeObjectiveScores } from "./scoring.js";

export { computePreferenceScore } from "./preference-scoring.js";

export { computePreferenceMetrics } from "./preference-metrics.js";

export { computePreferenceAwareFitness } from "./fitness.js";

export type {
  PreferenceFitnessDiagnostics,
  PreferenceFitnessOptions,
  PreferenceFitnessResult,
} from "./fitness.js";

export { createPreferenceModelState, updatePreferenceModelState } from "./preference-model.js";

export { selectActiveLearningPairs } from "./active-learning.js";
