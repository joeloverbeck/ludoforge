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
): Promise<GenerationLoopResult<TGenome, TFitness, TDescriptors>>;
