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

test("updatePreferenceModelState updates weights from comparisons deterministically", () => {
  const state = createPreferenceModelState({ learningRate: 0.1 });
  const feedback = {
    type: "comparison",
    preferred: "a",
    featureA: { agency: 1, variety: 0 },
    featureB: { agency: 0, variety: 1 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, 0.1);
  assert.equal(next.weights.variety, -0.1);
  assert.equal(next.bias, 0.1);
});

test("updatePreferenceModelState updates weights from ratings", () => {
  const state = createPreferenceModelState({ learningRate: 0.2 });
  const feedback = {
    type: "rating",
    rating: -0.5,
    featureVector: { agency: 1, pacing: 2 },
  };

  const next = updatePreferenceModelState(state, feedback);

  assert.equal(next.weights.agency, -0.05);
  assert.equal(next.weights.pacing, -0.1);
  assert.equal(next.bias, -0.05);
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

  assert.equal(next.weights.agency, -0.1);
  assert.equal(next.bias, -0.05);
});
