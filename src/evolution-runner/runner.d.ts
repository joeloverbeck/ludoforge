import type { EvaluationAdapterOptions, GenerationLoopCandidate, GenerationLoopRejection, MapElitesResult } from "../evolutionary-engine/types.js";
import type { Genome, MutationOperator, CrossoverOperator, RepairOperator } from "../evolutionary-engine/types.js";
import type { SeededRng } from "../simulation-engine/types.js";
import type { FeedbackRecord, PreferenceModelSnapshotRecord } from "../data-persistence/types.js";
import type { EvolutionRunnerConfig } from "./config.js";
import type { GenerationArtifactDeterminism, GenerationArtifactPaths } from "./artifact-writer.js";

export interface GenerationContext<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> {
  generation: number;
  runId: string;
  baseDir: string;
  loopResult: {
    evaluated: ReadonlyArray<GenerationLoopCandidate<TGenome, TFitness, TDescriptors>>;
    rejected: ReadonlyArray<GenerationLoopRejection<TGenome>>;
    mapElites: MapElitesResult<TGenome>;
    nextGeneration: ReadonlyArray<TGenome>;
    shortlist: ReadonlyArray<TGenome>;
  };
  population: ReadonlyArray<TGenome>;
}

export type PreferenceModelSnapshotProvider<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> = (
  context: GenerationContext<TGenome, TFitness, TDescriptors>
) => PreferenceModelSnapshotRecord[];

export type FeedbackProvider<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> = (
  context: GenerationContext<TGenome, TFitness, TDescriptors>
) => FeedbackRecord[] | Promise<FeedbackRecord[]>;

export interface EvolutionRunnerOptions<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> {
  baseDir?: string;
  runId?: string;
  startGeneration?: number;
  population: ReadonlyArray<TGenome>;
  config: EvolutionRunnerConfig;
  evaluation: EvaluationAdapterOptions<TGenome, TFitness, TDescriptors>;
  seed?: number;
  rng?: SeededRng;
  mutationOperators?: ReadonlyArray<MutationOperator<TGenome>>;
  crossoverOperators?: ReadonlyArray<CrossoverOperator<TGenome>>;
  repairOperators?: ReadonlyArray<RepairOperator<TGenome>>;
  preferenceModelSnapshots?: PreferenceModelSnapshotRecord[] | PreferenceModelSnapshotProvider<TGenome, TFitness, TDescriptors>;
  feedback?: FeedbackRecord[] | FeedbackProvider<TGenome, TFitness, TDescriptors>;
  determinism?: GenerationArtifactDeterminism;
}

export interface GenerationRunnerResult<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> {
  generation: number;
  population: ReadonlyArray<TGenome>;
  evaluated: ReadonlyArray<GenerationLoopCandidate<TGenome, TFitness, TDescriptors>>;
  rejected: ReadonlyArray<GenerationLoopRejection<TGenome>>;
  mapElites: MapElitesResult<TGenome>;
  shortlist: ReadonlyArray<TGenome>;
  artifacts: GenerationArtifactPaths;
}

export interface EvolutionRunnerResult<TGenome = Genome, TFitness = unknown, TDescriptors = unknown> {
  runId: string;
  baseDir: string;
  generations: ReadonlyArray<GenerationRunnerResult<TGenome, TFitness, TDescriptors>>;
}

export function runEvolutionRunner<TGenome = Genome, TFitness = unknown, TDescriptors = unknown>(
  options: EvolutionRunnerOptions<TGenome, TFitness, TDescriptors>
): Promise<EvolutionRunnerResult<TGenome, TFitness, TDescriptors>>;
