import assert from "node:assert/strict";
import test from "node:test";

import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../../../src/evaluation-analytics/preference-model.js";

test("updatePreferenceModelState does not mutate prior state", () => {
  const initial = createPreferenceModelState({
    weights: { agency: 1 },
    bias: 0.5,
    sampleCount: 2,
    history: [
      { type: "rating", rating: 1, featureVector: { agency: 0.2 } },
    ],
  });

  const frozenWeights = { ...initial.weights };
  const frozenHistory = [...initial.history];
  Object.freeze(initial.weights);
  Object.freeze(initial.history);
  Object.freeze(initial);

  const next = updatePreferenceModelState(initial, {
    type: "rating",
    rating: 1,
    featureVector: { agency: 0.4 },
  });

  assert.deepEqual(initial.weights, frozenWeights);
  assert.deepEqual(initial.history, frozenHistory);
  assert.notStrictEqual(next, initial);
});

test("updatePreferenceModelState applies bounded history", () => {
  let state = createPreferenceModelState({ maxHistory: 2 });
  const samples = [
    { type: "rating", rating: 1, featureVector: { agency: 0.2 } },
    { type: "rating", rating: -1, featureVector: { agency: 0.3 } },
    { type: "rating", rating: 0.5, featureVector: { agency: 0.4 } },
  ];

  for (const sample of samples) {
    state = updatePreferenceModelState(state, sample);
  }

  assert.equal(state.history.length, 2);
  assert.deepEqual(state.history, samples.slice(1));
});

test("preference model config defaults when inputs are invalid", () => {
  const created = createPreferenceModelState({
    comparisonWeight: Number.NaN,
    ratingWeight: Number.POSITIVE_INFINITY,
    weightDecay: Number.NaN,
    maxWeightAbs: Number.NaN,
    maxBiasAbs: Number.NaN,
  });

  assert.equal(created.comparisonWeight, 1);
  assert.equal(created.ratingWeight, 0.25);
  assert.equal(created.weightDecay, 0);
  assert.equal(created.maxWeightAbs, 5);
  assert.equal(created.maxBiasAbs, 5);

  const next = updatePreferenceModelState(
    { ...created, comparisonWeight: Number.NaN, ratingWeight: Number.NaN },
    { type: "comparison", preferred: "tie", featureA: {}, featureB: {} },
  );

  assert.equal(next.comparisonWeight, 1);
  assert.equal(next.ratingWeight, 0.25);
  assert.equal(next.weightDecay, 0);
  assert.equal(next.maxWeightAbs, 5);
  assert.equal(next.maxBiasAbs, 5);
});

test("updatePreferenceModelState updates weights from comparisons deterministically", () => {
  const state = createPreferenceModelState({ learningRate: 0.1 });
  const feedback = {
    type: "comparison",
    preferred: "a",
    featureA: { agency: 1, variety: 0 },
    featureB: { agency: 0, variety: 1 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, 0.05);
  assert.equal(next.weights.variety, -0.05);
  assert.equal(next.bias, 0.05);
});

test("updatePreferenceModelState updates weights from ratings", () => {
  const state = createPreferenceModelState({ learningRate: 0.2 });
  const feedback = {
    type: "rating",
    rating: -0.5,
    featureVector: { agency: 1, pacing: 2 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, -0.025);
  assert.equal(next.weights.pacing, -0.05);
  assert.equal(next.bias, -0.025);
  assert.equal(next.sampleCount, 1);
});

test("updatePreferenceModelState maps 1-5 ratings into prediction error updates", () => {
  const state = createPreferenceModelState({ learningRate: 0.1 });
  const feedback = {
    type: "rating",
    rating: 1,
    featureVector: { agency: 2 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, -0.05);
  assert.equal(next.bias, -0.025);
});

test("updatePreferenceModelState applies tie comparisons as neutral targets", () => {
  const state = createPreferenceModelState({ learningRate: 0.1 });
  const feedback = {
    type: "comparison",
    preferred: "tie",
    featureA: { agency: 1 },
    featureB: { agency: 0 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, 0);
  assert.equal(next.bias, 0);
});

test("updatePreferenceModelState applies weight decay and clamps", () => {
  const state = createPreferenceModelState({
    learningRate: 0.5,
    comparisonWeight: 0,
    weightDecay: 1,
    maxWeightAbs: 1.5,
    maxBiasAbs: 2,
    weights: { agency: 4, variety: -4 },
    bias: 5,
  });
  const feedback = {
    type: "comparison",
    preferred: "tie",
    featureA: {},
    featureB: {},
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, 1.5);
  assert.equal(next.weights.variety, -1.5);
  assert.equal(next.bias, 2);
});
