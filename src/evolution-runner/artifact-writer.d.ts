import type {
  FeedbackRecord,
  PreferenceModelSnapshotRecord,
} from "../data-persistence/types.js";
import type { PreferenceMetrics } from "../evaluation-analytics/types.js";

export interface GenerationArtifactDeterminism {
  seed?: number;
  rng?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GenerationGenomeEntry {
  id: string;
  definition: Record<string, unknown>;
}

export interface GenerationArtifactInput {
  baseDir?: string;
  runId: string;
  generation: number;
  population: GenerationGenomeEntry[];
  evaluated?: Record<string, unknown>[];
  rejected?: Record<string, unknown>[];
  mapElites?: Record<string, unknown>;
  shortlist?: unknown;
  feedback?: FeedbackRecord[];
  preferenceModelSnapshots: PreferenceModelSnapshotRecord[];
  determinism?: GenerationArtifactDeterminism;
  operatorStats?: Record<string, unknown>;
  health?: Record<string, unknown>;
  preferenceMetrics?: PreferenceMetrics;
}

export interface GenerationArtifactPaths {
  generationDir: string;
  populationPath: string;
  preferenceModelPath: string;
  evaluatedPath?: string;
  rejectedPath?: string;
  mapElitesPath?: string;
  shortlistPath?: string;
  feedbackPath?: string;
  determinismPath?: string;
  operatorStatsPath?: string;
  healthPath?: string;
  preferenceMetricsPath?: string;
}

export function writeGenerationArtifacts(
  input: GenerationArtifactInput,
): Promise<GenerationArtifactPaths>;
