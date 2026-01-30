import { loadConfigFile } from "../config/loader.js";
import { createSeededRng } from "../simulation-engine/rng.js";
import { computePreferenceScore } from "./preference-scoring.js";

const FALLBACK_LEARNING_RATE = 0.05;
const FALLBACK_MAX_HISTORY = 100;
const FALLBACK_COMPARISON_WEIGHT = 1.0;
const FALLBACK_RATING_WEIGHT = 0.25;
const FALLBACK_WEIGHT_DECAY = 0.0;
const FALLBACK_MAX_WEIGHT_ABS = 5.0;
const FALLBACK_MAX_BIAS_ABS = 5.0;
const FALLBACK_ENSEMBLE_SIZE = 5;

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

async function loadDefaultPreferenceModelConfig() {
  const result = await loadConfigFile({ name: "preference-model" });
  if (!result.valid) {
    throw new Error(
      `Preference model config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_PREFERENCE_MODEL_CONFIG = await loadDefaultPreferenceModelConfig();

function safeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function safeInteger(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

const DEFAULT_LEARNING_RATE = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.learningRate,
  FALLBACK_LEARNING_RATE
);
const DEFAULT_MAX_HISTORY = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxHistory,
  FALLBACK_MAX_HISTORY
);
const DEFAULT_COMPARISON_WEIGHT = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.comparisonWeight,
  FALLBACK_COMPARISON_WEIGHT
);
const DEFAULT_RATING_WEIGHT = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.ratingWeight,
  FALLBACK_RATING_WEIGHT
);
const DEFAULT_WEIGHT_DECAY = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.weightDecay,
  FALLBACK_WEIGHT_DECAY
);
const DEFAULT_MAX_WEIGHT_ABS = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxWeightAbs,
  FALLBACK_MAX_WEIGHT_ABS
);
const DEFAULT_MAX_BIAS_ABS = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxBiasAbs,
  FALLBACK_MAX_BIAS_ABS
);
const DEFAULT_ENSEMBLE_SIZE = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.ensembleSize,
  FALLBACK_ENSEMBLE_SIZE
);

function cloneFeatureVector(vector) {
  return vector && typeof vector === "object" ? { ...vector } : {};
}

function scaleFeatureVector(vector, scalar) {
  const result = {};
  for (const [key, value] of Object.entries(vector ?? {})) {
    result[key] = (Number.isFinite(value) ? value : 0) * scalar;
  }
  return result;
}

function clampAbs(value, limit) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const absLimit = Math.abs(Number.isFinite(limit) ? limit : 0);
  if (absLimit === 0) {
    return 0;
  }
  if (value >= absLimit) {
    return absLimit;
  }
  if (value <= -absLimit) {
    return -absLimit;
  }
  return value;
}

function normalizeRatingTargetCentered(rating) {
  if (!Number.isFinite(rating)) {
    return 0;
  }
  if (rating >= 1 && rating <= 5) {
    return ((rating - 1) / 4) * 2 - 1;
  }
  if (rating >= -1 && rating <= 1) {
    return rating;
  }
  return rating;
}

function addFeatureVectors(base, delta) {
  const result = { ...base };
  for (const [key, value] of Object.entries(delta ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current + (Number.isFinite(value) ? value : 0);
  }
  return result;
}

function diffFeatureVectors(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b ?? {})) {
    const current = Number.isFinite(result[key]) ? result[key] : 0;
    result[key] = current - (Number.isFinite(value) ? value : 0);
  }
  return result;
}

function clampHistory(history, maxHistory) {
  if (maxHistory <= 0) {
    return [];
  }
  if (history.length <= maxHistory) {
    return history;
  }
  return history.slice(history.length - maxHistory);
}

function normalizeComparisonTarget(preferred) {
  if (preferred === "a") {
    return 1;
  }
  if (preferred === "b") {
    return 0;
  }
  return 0.5;
}

function safeLearningRate(value) {
  return safeNumber(value, DEFAULT_LEARNING_RATE);
}

function resolveEnsembleSize(explicitSize, modelCount) {
  const sizeFromModels = safeInteger(modelCount, null);
  const sizeFromOption = safeInteger(explicitSize, null);
  const size = sizeFromOption ?? sizeFromModels ?? DEFAULT_ENSEMBLE_SIZE;
  return Math.max(1, Math.floor(size));
}

function normalizeModelSnapshot(snapshot, defaultSampleCount = 0) {
  return {
    weights: cloneFeatureVector(snapshot?.weights),
    bias: Number.isFinite(snapshot?.bias) ? snapshot.bias : 0,
    sampleCount: Number.isFinite(snapshot?.sampleCount) ? snapshot.sampleCount : defaultSampleCount,
  };
}

function resolveRng(options) {
  if (options?.rng && typeof options.rng.next === "function") {
    return options.rng;
  }
  if (Number.isInteger(options?.seed)) {
    return createSeededRng(options.seed);
  }
  return null;
}

function nextRandom(rng) {
  return rng ? rng.next() : Math.random();
}

function samplePoisson(lambda, rng) {
  const rate = Number.isFinite(lambda) && lambda > 0 ? lambda : 0;
  if (rate === 0) {
    return 0;
  }
  const limit = Math.exp(-rate);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= nextRandom(rng);
  } while (p > limit);
  return k - 1;
}

function applyWeightDecay(weights, learningRate, weightDecay) {
  const decay = learningRate * weightDecay;
  if (!Number.isFinite(decay) || decay === 0) {
    return weights;
  }
  const result = {};
  for (const [key, value] of Object.entries(weights)) {
    const current = Number.isFinite(value) ? value : 0;
    result[key] = current - decay * current;
  }
  return result;
}

function clampWeights(weights, maxAbs) {
  const result = {};
  for (const [key, value] of Object.entries(weights)) {
    result[key] = clampAbs(value, maxAbs);
  }
  return result;
}

function applyFeedbackUpdate(model, feedback, params) {
  const baseWeights = cloneFeatureVector(model?.weights);
  const baseBias = Number.isFinite(model?.bias) ? model.bias : 0;
  const baseSampleCount = Number.isFinite(model?.sampleCount) ? model.sampleCount : 0;
  let weightDelta = {};
  let biasDelta = 0;

  if (feedback?.type === "comparison") {
    const target = normalizeComparisonTarget(feedback.preferred);
    const diff = diffFeatureVectors(feedback.featureA, feedback.featureB);
    const prediction = computePreferenceScore({ weights: baseWeights, bias: baseBias }, diff).score;
    const error = target - prediction;
    const scaledError = params.learningRate * params.comparisonWeight * error;
    weightDelta = scaleFeatureVector(diff, scaledError);
    biasDelta = scaledError;
  } else if (feedback?.type === "rating") {
    const rating = Number.isFinite(feedback.rating) ? feedback.rating : null;
    if (rating !== null) {
      const targetCentered = clampAbs(normalizeRatingTargetCentered(rating), 1);
      const prediction = computePreferenceScore(
        { weights: baseWeights, bias: baseBias },
        feedback.featureVector,
      ).score;
      const predictionCentered = (prediction - 0.5) * 2;
      const error = targetCentered - predictionCentered;
      const scaledError = params.learningRate * params.ratingWeight * error;
      weightDelta = scaleFeatureVector(feedback.featureVector, scaledError);
      biasDelta = scaledError;
    }
  }

  const updatedWeights = addFeatureVectors(baseWeights, weightDelta);
  const decayedWeights = applyWeightDecay(updatedWeights, params.learningRate, params.weightDecay);
  const clampedWeights = clampWeights(decayedWeights, params.maxWeightAbs);
  const updatedBias = baseBias + biasDelta;
  const decayedBias = updatedBias - params.learningRate * params.weightDecay * updatedBias;
  const clampedBias = clampAbs(decayedBias, params.maxBiasAbs);

  return {
    weights: clampedWeights,
    bias: clampedBias,
    sampleCount: baseSampleCount + 1,
  };
}

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
