import type { GameDefinition } from "../dsl/types.js";
import type { TerminationResult } from "../game-kernel/termination.js";
import type {
  AgentController,
  AgentDescriptor,
  SimulationResult,
  SimulationTerminationReason,
  TrajectoryStep,
} from "../simulation-engine/types.js";

export interface SimulationLogMetadata {
  candidateId?: string;
  seed?: number;
  createdAt?: string;
  notes?: string;
}

export interface SimulationLog {
  definition: GameDefinition;
  results: ReadonlyArray<SimulationResult>;
  metadata?: SimulationLogMetadata;
}

export interface EvaluationAnalyticsInput {
  definition: GameDefinition;
  simulations: ReadonlyArray<SimulationResult>;
  logMetadata?: SimulationLogMetadata;
}

export interface TrajectorySummary {
  stepCount: number;
  turnCount: number;
  terminalOutcome: TerminationResult;
  terminationReason?: SimulationTerminationReason;
  actionCounts?: Record<string, number>;
  uniqueStateCount?: number;
  keySteps?: ReadonlyArray<TrajectoryKeyStep>;
}

export interface TrajectoryKeyStep {
  turn: number;
  phase: string | null;
  playerId: number | null;
  actionId?: string | null;
  legalActionCount?: number;
}

export type MetricId = string;

export interface MetricResult {
  id: MetricId;
  value: number;
  details?: Record<string, number | string | boolean>;
}

export type MetricResults = ReadonlyArray<MetricResult>;

export interface DecisionQualitySamplingConfig {
  enabled?: boolean;
  decisionSamplesPerRun?: number;
  rolloutsPerAction?: number;
  rolloutMaxSteps?: number;
  maxRolloutsPerRun?: number;
  rolloutAgent?: AgentController | AgentDescriptor;
  seed?: number;
  earlyStepPercent?: number;
}

export interface ExtendedMetricsOptions {
  simulations?: ReadonlyArray<SimulationResult>;
  meaningfulChoice?: DecisionQualitySamplingConfig;
  comebackPotential?: DecisionQualitySamplingConfig;
}

export type DegeneracyFlag =
  | "loop"
  | "stalemate"
  | "forced-move"
  | "dominant-action"
  | "trivial-win"
  | "no-choices"
  | "non-terminating";

export interface DegeneracyReport {
  flags: ReadonlyArray<DegeneracyFlag>;
  details?: Partial<Record<DegeneracyFlag, string | number | boolean>>;
}

export type FeatureVector = Record<string, number>;

export interface CompositeScore {
  score: number;
  components?: FeatureVector;
  objectives?: Record<string, number>;
}

export interface PreferenceScore {
  score: number;
  confidence: number;
}

export interface PreferenceCalibrationBucket {
  lowerBound: number;
  upperBound: number;
  count: number;
  averagePredicted: number;
  averageOutcome: number;
}

export interface PreferenceMetrics {
  accuracy: number;
  correct: number;
  total: number;
  ties: number;
  bucketSize: number;
  calibrationBuckets: ReadonlyArray<PreferenceCalibrationBucket>;
}

export interface PreferenceModelUpdate {
  weights: FeatureVector;
  bias?: number;
  sampleCount?: number;
  learningRate?: number;
}

export interface PreferenceModelState {
  version: number;
  weights: FeatureVector;
  bias: number;
  sampleCount: number;
  history: ReadonlyArray<PreferenceFeedbackSample>;
  learningRate: number;
  maxHistory: number;
  comparisonWeight: number;
  ratingWeight: number;
  weightDecay: number;
  maxWeightAbs: number;
  maxBiasAbs: number;
}

export interface ActiveLearningCandidate {
  id: string;
  featureVector: FeatureVector;
  nicheId?: string;
}

export interface ActiveLearningPair {
  candidateA: ActiveLearningCandidate;
  candidateB: ActiveLearningCandidate;
  winProbability: number;
  uncertainty: number;
}

export interface ActiveLearningSelectionOptions {
  maxPairs?: number;
  uncertaintyThreshold?: number;
  diversityQuota?: number;
  cadence?: number;
  iteration?: number;
}

export interface PreferenceFeedbackComparison {
  type: "comparison";
  preferred: "a" | "b" | "tie";
  featureA: FeatureVector;
  featureB: FeatureVector;
  gameAId?: string;
  gameBId?: string;
  winnerId?: string;
  userId?: string;
  contextTag?: string;
  confidence?: number;
  notes?: string;
}

export interface PreferenceFeedbackRating {
  type: "rating";
  rating: number;
  featureVector: FeatureVector;
}

export type PreferenceFeedbackSample = PreferenceFeedbackComparison | PreferenceFeedbackRating;

export interface EvaluationAnalyticsOutput {
  trajectorySummaries: ReadonlyArray<TrajectorySummary>;
  metrics: MetricResults;
  degeneracy: DegeneracyReport;
  featureVector: FeatureVector;
  compositeScore?: CompositeScore;
  preferenceModelUpdate?: PreferenceModelUpdate;
}
