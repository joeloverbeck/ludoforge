import type { CompositeScore, FeatureVector } from "./types.js";

export interface CompositeScoreOptions {
  weights?: FeatureVector;
  normalizeWeights?: boolean;
  defaultWeight?: number;
  defaultWeights?: FeatureVector;
  includeComponents?: boolean;
  objectives?: Record<string, FeatureVector>;
  objectiveDefaultWeight?: number;
}

export interface FitnessBlendOptions {
  preferenceWeight?: number;
  preferenceCap?: number;
  preferenceBootstrapCap?: number;
  preferenceBootstrapSamples?: number;
  preferenceSampleCount?: number;
  diversityWeight?: number;
  allowPreference?: boolean;
  degeneracyPenalty?: number;
}

export interface FitnessBlendComponents {
  base: number;
  preference: number;
  diversity: number;
  preferenceCap: number;
  degeneracyPenalty: number;
}

export interface FitnessBlendResult {
  score: number;
  components: FitnessBlendComponents;
}

export function computeObjectiveScores(
  featureVector: FeatureVector,
  objectives: Record<string, FeatureVector>,
  options?: CompositeScoreOptions
): Record<string, number> | undefined;

export function computeCompositeScore(
  featureVector: FeatureVector,
  options?: CompositeScoreOptions
): CompositeScore;

export function combineFitnessScores(
  compositeScore: number,
  preferenceScore: number | null | undefined,
  diversityPressure: number | null | undefined,
  options?: FitnessBlendOptions
): FitnessBlendResult;
