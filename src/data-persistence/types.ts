import type { GameDefinition } from "../dsl/types.js";
import type { AgentDescriptor, Trajectory } from "../simulation-engine/types.js";
import type {
  CompositeScore,
  DegeneracyReport,
  FeatureVector,
  MetricResults,
  PreferenceFeedbackSample,
  TrajectorySummary,
} from "../evaluation-analytics/types.js";

export type RecordId = string;
export type RecordVersion = string;

export interface BaseRecord {
  id: RecordId;
  version: RecordVersion;
  createdAt: string;
  updatedAt?: string;
  engineVersion?: string;
  seed?: number;
}

export interface GameDefinitionDescriptors {
  name?: string;
  description?: string;
  tags?: ReadonlyArray<string>;
}

export interface GameDefinitionRecord extends BaseRecord {
  definition: GameDefinition;
  descriptors?: GameDefinitionDescriptors;
}

export type PersistedAgent = AgentDescriptor;

export interface SimulationRunRecord extends BaseRecord {
  gameId: RecordId;
  agents: ReadonlyArray<PersistedAgent>;
  summary: TrajectorySummary;
}

export interface TrajectoryLogRecord extends BaseRecord {
  gameId: RecordId;
  runId: RecordId;
  trajectory: Trajectory;
}

export interface MetricsRecord extends BaseRecord {
  gameId: RecordId;
  runId?: RecordId;
  metrics: MetricResults;
  featureVector: FeatureVector;
  compositeScore?: CompositeScore;
  degeneracy?: DegeneracyReport;
}

export interface FeedbackRecord extends BaseRecord {
  gameId?: RecordId;
  runId?: RecordId;
  feedback: PreferenceFeedbackSample;
  tags?: ReadonlyArray<string>;
  rationale?: string;
}

export type RecordType =
  | "game-definition"
  | "simulation-run"
  | "trajectory-log"
  | "metrics"
  | "feedback";

export interface RecordEnvelope<TType extends RecordType, TPayload extends BaseRecord> {
  type: TType;
  payload: TPayload;
}

export type GameDefinitionEnvelope = RecordEnvelope<
  "game-definition",
  GameDefinitionRecord
>;

export type SimulationRunEnvelope = RecordEnvelope<
  "simulation-run",
  SimulationRunRecord
>;

export type TrajectoryLogEnvelope = RecordEnvelope<
  "trajectory-log",
  TrajectoryLogRecord
>;

export type MetricsEnvelope = RecordEnvelope<"metrics", MetricsRecord>;

export type FeedbackEnvelope = RecordEnvelope<"feedback", FeedbackRecord>;

export type DataPersistenceEnvelope =
  | GameDefinitionEnvelope
  | SimulationRunEnvelope
  | TrajectoryLogEnvelope
  | MetricsEnvelope
  | FeedbackEnvelope;

export type DataPersistenceRecord =
  | GameDefinitionRecord
  | SimulationRunRecord
  | TrajectoryLogRecord
  | MetricsRecord
  | FeedbackRecord;
