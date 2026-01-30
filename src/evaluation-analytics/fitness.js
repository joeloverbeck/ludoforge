import { combineFitnessScores, computeCompositeScore } from "./scoring.js";
import { computePreferenceScore } from "./preference-scoring.js";
import { computeDegeneracyPenalty } from "./degeneracy.js";
import { loadConfigFile } from "../config/loader.js";

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultFitnessConfig() {
  const result = await loadConfigFile({ name: "fitness" });
  if (!result.valid) {
    throw new Error(
      `Fitness config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_FITNESS_CONFIG = await loadDefaultFitnessConfig();

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
  const baseCompositeScoreOptions = options.compositeScoreOptions;
  const baseDefaultWeights =
    baseCompositeScoreOptions && typeof baseCompositeScoreOptions.defaultWeights === "object"
      ? baseCompositeScoreOptions.defaultWeights
      : null;
  const compositeDefaults = DEFAULT_FITNESS_CONFIG && typeof DEFAULT_FITNESS_CONFIG === "object"
    ? {
      weights: DEFAULT_FITNESS_CONFIG.weights,
      normalizeWeights: DEFAULT_FITNESS_CONFIG.weightNormalization,
    }
    : {};
  const compositeScoreOptions = baseCompositeScoreOptions
    ? {
      ...compositeDefaults,
      ...baseCompositeScoreOptions,
      defaultWeights: { ...(baseDefaultWeights ?? {}) },
    }
    : {
      ...compositeDefaults,
    };

  const compositeScore = options.compositeScore ??
    computeCompositeScore(featureVector, compositeScoreOptions);
  const allowPreference = options.allowPreference ?? true;
  const preferenceModelState = options.preferenceModelState;
  const preferenceSampleCount = resolvePreferenceSampleCount(preferenceModelState, options);
  const fitnessDefaults = DEFAULT_FITNESS_CONFIG ?? {};
  const preferenceWeight = options.preferenceWeight ?? fitnessDefaults.preferenceWeight;
  const preferenceCap = options.preferenceCap ?? fitnessDefaults.preferenceCap;
  const preferenceBootstrapSamples =
    options.preferenceBootstrapSamples ?? fitnessDefaults.preferenceBootstrapSamples;
  const preferenceBootstrapCap =
    options.preferenceBootstrapCap ?? fitnessDefaults.preferenceBootstrapCap;

  let preferenceScore;
  if (preferenceModelState && allowPreference !== false) {
    preferenceScore = computePreferenceScore(preferenceModelState, featureVector);
  }

  const degeneracyPenaltyValue = options.degeneracyReport
    ? computeDegeneracyPenalty(options.degeneracyReport, options.degeneracyPenaltyConfig)
    : 0;

  const preferenceUncertainty = preferenceScore?.uncertainty;

  const blend = combineFitnessScores(compositeScore.score, preferenceScore?.score, {
    allowPreference,
    preferenceSampleCount,
    preferenceWeight,
    preferenceCap,
    preferenceBootstrapSamples,
    preferenceBootstrapCap,
    preferenceUncertainty,
    degeneracyPenalty: degeneracyPenaltyValue,
  });

  return {
    score: blend.score,
    compositeScore,
    preferenceScore,
    diagnostics: {
      preferenceScore: preferenceScore?.score ?? null,
      preferenceConfidence: preferenceScore?.confidence ?? null,
      preferenceUncertainty: preferenceScore?.uncertainty ?? null,
      blend: blend.components,
      degeneracyPenalty: degeneracyPenaltyValue,
    },
  };
}

export { computePreferenceAwareFitness };
