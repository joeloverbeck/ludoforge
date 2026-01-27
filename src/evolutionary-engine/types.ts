import type { GameDefinition } from "../dsl/types.js";
import type { SeededRng } from "../simulation-engine/types.js";
import type { GenomeValidationResult } from "./serialization.js";

export type GenomeId = string;

export interface Genome {
  id?: GenomeId;
  definition: GameDefinition;
}

export type DescriptorId = string;
export type DescriptorValue = number;
export type DescriptorSet = Record<DescriptorId, DescriptorValue>;

export type FitnessScore = number | Record<string, number>;

export interface PopulationMember<TGenome = Genome> {
  genome: TGenome;
  fitness?: FitnessScore;
  descriptors?: DescriptorSet;
}

export type Population<TGenome = Genome> = ReadonlyArray<PopulationMember<TGenome>>;

export interface Niche<TCoordinates = ReadonlyArray<number>> {
  id: string;
  coordinates?: TCoordinates;
  descriptors?: DescriptorSet;
}

export interface MapElitesDescriptorConfig {
  id: DescriptorId;
  min: number;
  max: number;
  bins: number;
}

export interface MapElitesConfig<TGenome = Genome> {
  descriptors: ReadonlyArray<MapElitesDescriptorConfig>;
  fitnessKey?: string;
  tieBreak?: "keep-existing" | "replace";
  compareFitness?: (
    candidate: PopulationMember<TGenome>,
    elite: PopulationMember<TGenome>
  ) => number;
}

export interface MapElitesPlacement<TGenome = Genome> {
  member: PopulationMember<TGenome>;
  nicheId: string;
  coordinates: ReadonlyArray<number>;
  isElite: boolean;
  noveltyScore: number;
}

export interface MapElitesSkippedCandidate<TGenome = Genome> {
  member: PopulationMember<TGenome>;
  reason: string;
}

export interface MapElitesResult<TGenome = Genome> {
  elites: Map<string, PopulationMember<TGenome>>;
  placements: ReadonlyArray<MapElitesPlacement<TGenome>>;
  skipped: ReadonlyArray<MapElitesSkippedCandidate<TGenome>>;
}

export interface MutationOperator<TGenome = Genome> {
  name: string;
  mutate: (genome: TGenome, rng?: SeededRng) => TGenome;
}

export interface CrossoverOperator<TGenome = Genome> {
  name: string;
  crossover: (parentA: TGenome, parentB: TGenome, rng?: SeededRng) => TGenome | null;
}

export interface RepairOperator<TGenome = Genome> {
  name: string;
  repair: (genome: TGenome, rng?: SeededRng) => TGenome | null;
}

export interface SafetyGateResult {
  ok: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface SafetyGateFailure {
  name: string;
  reason: string;
  details?: Record<string, unknown>;
}

export interface SafetyGate<TGenome = Genome> {
  name: string;
  check: (genome: TGenome) => SafetyGateResult | boolean;
}

export interface EvaluationDiagnostics {
  validation: GenomeValidationResult;
  safety: ReadonlyArray<SafetyGateFailure>;
  evaluation?: Record<string, unknown>;
}

export interface EvaluationAdapterOutput<
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  fitness: TFitness;
  descriptors: TDescriptors;
  diagnostics?: Record<string, unknown>;
}

export interface EvaluationAdapterOptions<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  evaluator: (genome: TGenome) => EvaluationAdapterOutput<TFitness, TDescriptors>;
  gates?: ReadonlyArray<SafetyGate<TGenome>>;
}

export interface EvaluationAdapterResult<
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  fitness: TFitness | null;
  descriptors: TDescriptors | null;
  diagnostics: EvaluationDiagnostics;
}

export interface GenerationLoopOptions<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  population: ReadonlyArray<TGenome>;
  evaluation: EvaluationAdapterOptions<TGenome, TFitness, TDescriptors>;
  mapElites: MapElitesConfig<TGenome>;
  rng?: SeededRng;
  shortlistSize?: number;
}

export interface GenerationLoopCandidate<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  genome: TGenome;
  fitness: TFitness;
  descriptors: TDescriptors;
  diagnostics: EvaluationDiagnostics;
}

export interface GenerationLoopRejection<TGenome = Genome> {
  genome: TGenome;
  diagnostics: EvaluationDiagnostics;
}

export interface GenerationLoopResult<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
> {
  evaluated: ReadonlyArray<GenerationLoopCandidate<TGenome, TFitness, TDescriptors>>;
  rejected: ReadonlyArray<GenerationLoopRejection<TGenome>>;
  mapElites: MapElitesResult<TGenome>;
  nextGeneration: ReadonlyArray<TGenome>;
  shortlist: ReadonlyArray<TGenome>;
}
