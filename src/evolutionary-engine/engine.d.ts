import type {
  DescriptorSet,
  FitnessScore,
  Genome,
  GenerationLoopOptions,
  GenerationLoopResult,
} from "./types.js";

export function runGenerationLoop<
  TGenome = Genome,
  TFitness = FitnessScore,
  TDescriptors = DescriptorSet
>(
  options: GenerationLoopOptions<TGenome, TFitness, TDescriptors>
): GenerationLoopResult<TGenome, TFitness, TDescriptors>;
