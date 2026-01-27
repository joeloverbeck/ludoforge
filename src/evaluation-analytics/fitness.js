import { combineFitnessScores, computeCompositeScore } from "./scoring.js";
import { computePreferenceScore } from "./preference-scoring.js";

function resolvePreferenceSampleCount(state, options) {
  if (Number.isFinite(options.preferenceSampleCount)) {
    return options.preferenceSampleCount;
  }
  if (Number.isFinite(state?.sampleCount)) {
    return state.sampleCount;
  }
  return 0;
}

function computePreferenceAwareFitness(featureVector, options = {}) {
  const compositeScore = options.compositeScore ??
    computeCompositeScore(featureVector, options.compositeScoreOptions);
  const allowPreference = options.allowPreference ?? true;
  const preferenceModelState = options.preferenceModelState;
  const preferenceSampleCount = resolvePreferenceSampleCount(preferenceModelState, options);

  let preferenceScore;
  if (preferenceModelState && allowPreference !== false) {
    preferenceScore = computePreferenceScore(preferenceModelState, featureVector);
  }

  const blend = combineFitnessScores(
    compositeScore.score,
    preferenceScore?.score,
    options.diversityPressure,
    {
      ...options,
      allowPreference,
      preferenceSampleCount,
    }
  );

  return {
    score: blend.score,
    compositeScore,
    preferenceScore,
    diagnostics: {
      preferenceScore: preferenceScore?.score ?? null,
      preferenceConfidence: preferenceScore?.confidence ?? null,
      blend: blend.components,
    },
  };
}

export { computePreferenceAwareFitness };
