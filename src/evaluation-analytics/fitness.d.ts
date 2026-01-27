import type {
  CompositeScore,
  FeatureVector,
  PreferenceModelState,
  PreferenceScore,
} from "./types.js";
import type {
  CompositeScoreOptions,
  FitnessBlendComponents,
  FitnessBlendOptions,
} from "./scoring.js";

export interface PreferenceFitnessDiagnostics {
  preferenceScore: number | null;
  preferenceConfidence: number | null;
  blend: FitnessBlendComponents;
}

export interface PreferenceFitnessResult {
  score: number;
  compositeScore: CompositeScore;
  preferenceScore?: PreferenceScore;
  diagnostics: PreferenceFitnessDiagnostics;
}

export interface PreferenceFitnessOptions extends FitnessBlendOptions {
  compositeScore?: CompositeScore;
  compositeScoreOptions?: CompositeScoreOptions;
  preferenceModelState?: PreferenceModelState;
  diversityPressure?: number;
}

export function computePreferenceAwareFitness(
  featureVector: FeatureVector,
  options?: PreferenceFitnessOptions
): PreferenceFitnessResult;
