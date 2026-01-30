/**
 * Learning pipeline: parameter resolution, Poisson sampling, SGD weight updates.
 * Imports from config, feature-vector-math, value-transforms, rng.js, preference-scoring.js.
 */

import { createSeededRng } from "../../simulation-engine/rng.js";
import { computePreferenceScore } from "../preference-scoring.js";
import {
  cloneFeatureVector,
  scaleFeatureVector,
  addFeatureVectors,
  diffFeatureVectors,
} from "./feature-vector-math.js";
import {
  clampAbs,
  normalizeRatingTargetCentered,
  normalizeComparisonTarget,
} from "./value-transforms.js";
import {
  safeNumber,
  safeInteger,
  DEFAULT_LEARNING_RATE,
  DEFAULT_ENSEMBLE_SIZE,
} from "./config.js";

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

export {
  safeLearningRate,
  resolveEnsembleSize,
  normalizeModelSnapshot,
  resolveRng,
  nextRandom,
  samplePoisson,
  applyWeightDecay,
  clampWeights,
  applyFeedbackUpdate,
};
