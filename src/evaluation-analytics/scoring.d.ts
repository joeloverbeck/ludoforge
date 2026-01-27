import type { CompositeScore, FeatureVector } from "./types.js";

export interface CompositeScoreOptions {
  weights?: FeatureVector;
  normalizeWeights?: boolean;
  defaultWeight?: number;
  includeComponents?: boolean;
  objectives?: Record<string, FeatureVector>;
  objectiveDefaultWeight?: number;
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
