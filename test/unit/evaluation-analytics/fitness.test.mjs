import assert from "node:assert/strict";
import test from "node:test";

import { computePreferenceAwareFitness } from "../../../src/evaluation-analytics/fitness.js";

test("computePreferenceAwareFitness uses model sample count to lift bootstrap cap", () => {
  const featureVector = Object.freeze({ agency: 1 });
  const preferenceModelState = Object.freeze({
    version: 1,
    weights: { agency: 1 },
    bias: 0,
    sampleCount: 5,
    history: [],
    learningRate: 0.1,
    maxHistory: 100,
    comparisonWeight: 1,
    ratingWeight: 0.25,
    weightDecay: 0,
    maxWeightAbs: 5,
    maxBiasAbs: 5,
  });

  const result = computePreferenceAwareFitness(featureVector, {
    compositeScore: { score: 0, components: {} },
    preferenceModelState,
    preferenceCap: 0.4,
    preferenceBootstrapCap: 0.1,
    preferenceBootstrapSamples: 5,
  });

  assert.equal(result.diagnostics.blend.preferenceCap, 0.4);
  assert.equal(result.diagnostics.blend.preference, 0.4);
  assert.equal(result.score, 0.4);
});

test("computePreferenceAwareFitness skips preference scoring when gated", () => {
  const featureVector = Object.freeze({ agency: 1 });
  const preferenceModelState = Object.freeze({
    version: 1,
    weights: { agency: 1 },
    bias: 0,
    sampleCount: 10,
    history: [],
    learningRate: 0.1,
    maxHistory: 100,
    comparisonWeight: 1,
    ratingWeight: 0.25,
    weightDecay: 0,
    maxWeightAbs: 5,
    maxBiasAbs: 5,
  });

  const result = computePreferenceAwareFitness(featureVector, {
    compositeScore: { score: 1, components: {} },
    preferenceModelState,
    allowPreference: false,
  });

  assert.equal(result.preferenceScore, undefined);
  assert.equal(result.diagnostics.preferenceScore, null);
  assert.equal(result.diagnostics.preferenceConfidence, null);
  assert.equal(result.diagnostics.blend.preference, 0);
  assert.equal(result.score, 1);
});

test("computePreferenceAwareFitness reports diagnostics when preference is available", () => {
  const featureVector = { agency: 0.5, variety: 0.5 };
  const preferenceModelState = {
    version: 1,
    weights: { agency: 1, variety: 1 },
    bias: 0,
    sampleCount: 10,
    history: [],
    learningRate: 0.1,
    maxHistory: 100,
    comparisonWeight: 1,
    ratingWeight: 0.25,
    weightDecay: 0,
    maxWeightAbs: 5,
    maxBiasAbs: 5,
  };

  const result = computePreferenceAwareFitness(featureVector, {
    preferenceModelState,
    diversityPressure: 0.2,
    diversityWeight: 2,
  });

  assert.ok(Number.isFinite(result.diagnostics.preferenceScore));
  assert.ok(Number.isFinite(result.diagnostics.preferenceConfidence));
  assert.equal(typeof result.diagnostics.blend, "object");
  assert.ok(Number.isFinite(result.diagnostics.blend.base));
  assert.ok(Number.isFinite(result.diagnostics.blend.preference));
  assert.ok(Number.isFinite(result.diagnostics.blend.diversity));
  assert.ok(Number.isFinite(result.diagnostics.blend.preferenceCap));
});
