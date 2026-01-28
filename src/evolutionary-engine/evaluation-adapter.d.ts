import type {
  DescriptorSet,
  EvaluationAdapterOptions,
  EvaluationAdapterResult,
  FitnessScore,
  Genome,
} from "./types.js";

export function evaluateGenome<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
>(
  genome: TGenome,
  options: EvaluationAdapterOptions<TGenome, TFitness, TDescriptors>
): EvaluationAdapterResult<TFitness, TDescriptors, TGenome>;
