import type { FeatureVector, PreferenceModelState, PreferenceScore } from "./types.js";

export function computePreferenceScore(
  state: PreferenceModelState,
  featureVector: FeatureVector
): PreferenceScore;
