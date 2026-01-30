import {
  cloneFeatureVector,
} from "./preference-model/feature-vector-math.js";
import {
  clampHistory,
} from "./preference-model/value-transforms.js";
import {
  safeNumber,
  DEFAULT_LEARNING_RATE,
  DEFAULT_MAX_HISTORY,
  DEFAULT_COMPARISON_WEIGHT,
  DEFAULT_RATING_WEIGHT,
  DEFAULT_WEIGHT_DECAY,
  DEFAULT_MAX_WEIGHT_ABS,
  DEFAULT_MAX_BIAS_ABS,
} from "./preference-model/config.js";
import {
  safeLearningRate,
  resolveEnsembleSize,
  normalizeModelSnapshot,
  resolveRng,
  samplePoisson,
  applyFeedbackUpdate,
} from "./preference-model/sgd-update.js";

function createPreferenceModelState(options = {}) {
  const learningRate = safeLearningRate(options.learningRate);
  const maxHistory = Number.isFinite(options.maxHistory) ? options.maxHistory : DEFAULT_MAX_HISTORY;
  const history = clampHistory(options.history ? [...options.history] : [], maxHistory);
  const comparisonWeight = safeNumber(options.comparisonWeight, DEFAULT_COMPARISON_WEIGHT);
  const ratingWeight = safeNumber(options.ratingWeight, DEFAULT_RATING_WEIGHT);
  const weightDecay = safeNumber(options.weightDecay, DEFAULT_WEIGHT_DECAY);
  const maxWeightAbs = safeNumber(options.maxWeightAbs, DEFAULT_MAX_WEIGHT_ABS);
  const maxBiasAbs = safeNumber(options.maxBiasAbs, DEFAULT_MAX_BIAS_ABS);
  const ensembleSize = resolveEnsembleSize(options.ensembleSize, options.models?.length);
  const defaultSampleCount = Number.isFinite(options.sampleCount) ? options.sampleCount : 0;
  const baseWeights = cloneFeatureVector(options.weights);
  const baseBias = Number.isFinite(options.bias) ? options.bias : 0;
  const modelTemplates = Array.isArray(options.models) ? options.models : null;
  const models = modelTemplates?.length
    ? modelTemplates.slice(0, ensembleSize).map((model) =>
        normalizeModelSnapshot(model, defaultSampleCount)
      )
    : Array.from({ length: ensembleSize }, () => ({
        weights: cloneFeatureVector(baseWeights),
        bias: baseBias,
        sampleCount: defaultSampleCount,
      }));
  while (models.length < ensembleSize) {
    models.push({
      weights: cloneFeatureVector(baseWeights),
      bias: baseBias,
      sampleCount: defaultSampleCount,
    });
  }
  return {
    version: Number.isFinite(options.version) ? options.version : 1,
    sampleCount: defaultSampleCount,
    models,
    ensemble: { size: ensembleSize, method: "online-bagging" },
    history,
    learningRate,
    maxHistory,
    comparisonWeight,
    ratingWeight,
    weightDecay,
    maxWeightAbs,
    maxBiasAbs,
  };
}

function updatePreferenceModelState(state, feedback, options = {}) {
  const learningRate = safeLearningRate(options.learningRate ?? state.learningRate);
  const maxHistory = Number.isFinite(options.maxHistory) ? options.maxHistory : state.maxHistory;
  const comparisonWeight = safeNumber(
    options.comparisonWeight,
    safeNumber(state.comparisonWeight, DEFAULT_COMPARISON_WEIGHT),
  );
  const ratingWeight = safeNumber(
    options.ratingWeight,
    safeNumber(state.ratingWeight, DEFAULT_RATING_WEIGHT),
  );
  const weightDecay = safeNumber(
    options.weightDecay,
    safeNumber(state.weightDecay, DEFAULT_WEIGHT_DECAY),
  );
  const maxWeightAbs = safeNumber(
    options.maxWeightAbs,
    safeNumber(state.maxWeightAbs, DEFAULT_MAX_WEIGHT_ABS),
  );
  const maxBiasAbs = safeNumber(
    options.maxBiasAbs,
    safeNumber(state.maxBiasAbs, DEFAULT_MAX_BIAS_ABS),
  );
  const baseSampleCount = Number.isFinite(state.sampleCount) ? state.sampleCount : 0;
  const params = {
    learningRate,
    comparisonWeight,
    ratingWeight,
    weightDecay,
    maxWeightAbs,
    maxBiasAbs,
  };
  const rng = resolveRng(options);
  const legacyModel = state && !Array.isArray(state.models)
    ? {
        weights: cloneFeatureVector(state.weights),
        bias: Number.isFinite(state.bias) ? state.bias : 0,
        sampleCount: baseSampleCount,
      }
    : null;
  const baseModels = Array.isArray(state.models) ? state.models : legacyModel ? [legacyModel] : [];
  const ensembleSize = resolveEnsembleSize(state?.ensemble?.size, baseModels.length);

  const nextHistory = clampHistory([...(state.history ?? []), feedback], maxHistory);
  const models = [];
  for (let index = 0; index < ensembleSize; index += 1) {
    const baseModel = baseModels[index] ?? { weights: {}, bias: 0, sampleCount: 0 };
    let nextModel = normalizeModelSnapshot(baseModel);
    const repeats = samplePoisson(1, rng);
    for (let i = 0; i < repeats; i += 1) {
      nextModel = applyFeedbackUpdate(nextModel, feedback, params);
    }
    models.push(nextModel);
  }

  return {
    version: state.version + 1,
    sampleCount: baseSampleCount + 1,
    models,
    ensemble: {
      size: ensembleSize,
      method: "online-bagging",
    },
    history: nextHistory,
    learningRate,
    maxHistory,
    comparisonWeight,
    ratingWeight,
    weightDecay,
    maxWeightAbs,
    maxBiasAbs,
  };
}

export { createPreferenceModelState, updatePreferenceModelState };
