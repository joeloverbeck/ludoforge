import type {
  CompositeScore,
  DegeneracyReport,
  FeatureVector,
  PreferenceModelState,
  PreferenceScore,
} from "./types.js";
import type {
  CompositeScoreOptions,
  FitnessBlendComponents,
  FitnessBlendOptions,
} from "./scoring.js";
import type { DegeneracyPenaltyConfig } from "./degeneracy.js";

export interface PreferenceFitnessDiagnostics {
  preferenceScore: number | null;
  preferenceConfidence: number | null;
  blend: FitnessBlendComponents;
  degeneracyPenalty: number;
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
  degeneracyReport?: DegeneracyReport;
  degeneracyPenaltyConfig?: DegeneracyPenaltyConfig;
}

export function computePreferenceAwareFitness(
  featureVector: FeatureVector,
  options?: PreferenceFitnessOptions
): PreferenceFitnessResult;
