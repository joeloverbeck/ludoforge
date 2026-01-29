import type {
  DegeneracyReport,
  ExtendedMetricsOptions,
  FeatureVector,
  MetricResult,
  PreferenceModelState,
} from "./types.js";
import type { PreferenceFitnessResult, PreferenceFitnessOptions } from "./fitness.js";
import type { DegeneracyThresholds } from "./degeneracy.js";
import type { LogAdapterError } from "./log-adapter.js";
import type { GameDefinition } from "../dsl/types.js";
import type { AgentController, AgentDescriptor } from "../simulation-engine/types.js";

export interface CreateEvaluatorOptions {
  simulationConfig?: Record<string, unknown>;
  simulationRuns?: number;
  agentFactory?: (definition: GameDefinition) => Array<AgentController | AgentDescriptor>;
  fitnessOptions?: Partial<PreferenceFitnessOptions>;
  degeneracyThresholds?: DegeneracyThresholds;
  preferenceModelState?: PreferenceModelState | null;
  descriptorKeys?: string[];
  includeExtendedMetrics?: boolean;
  extendedMetricsOptions?: Partial<ExtendedMetricsOptions>;
  seed?: number | null;
}

export interface EvaluatorGenome {
  id?: string;
  definition: GameDefinition;
}

export interface EvaluationDiagnosticsSuccess {
  coreMetrics: MetricResult[];
  extendedMetrics: MetricResult[] | null;
  degeneracy: DegeneracyReport;
  featureVector: FeatureVector;
  fitnessResult: PreferenceFitnessResult;
  simulationCount: number;
  logAdapterOk: true;
}

export interface EvaluationDiagnosticsFailure {
  error: LogAdapterError;
  logAdapterOk: false;
}

export interface EvaluationResultSuccess {
  fitness: number;
  descriptors: Record<string, number | null>;
  diagnostics: EvaluationDiagnosticsSuccess;
}

export interface EvaluationResultFailure {
  fitness: null;
  descriptors: null;
  diagnostics: EvaluationDiagnosticsFailure;
}

export type EvaluationResult = EvaluationResultSuccess | EvaluationResultFailure;

export type Evaluator = (genome: EvaluatorGenome) => EvaluationResult;

export interface CreateEvaluatorResult {
  evaluator: Evaluator;
}

export function createEvaluator(options?: CreateEvaluatorOptions): CreateEvaluatorResult;
