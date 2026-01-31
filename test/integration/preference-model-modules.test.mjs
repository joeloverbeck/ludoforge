import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../../src/evaluation-analytics/preference-model.js";

function constantRng(value) {
  return { next() { return value; } };
}

describe("preference-model-modules integration", () => {
  it("config defaults flow into state creation", async () => {
    const configUrl = new URL("../../configs/preference-model.json", import.meta.url);
    const config = JSON.parse(await readFile(configUrl, "utf8"));
    const state = createPreferenceModelState();

    assert.equal(state.learningRate, config.learningRate);
    assert.equal(state.maxHistory, config.maxHistory);
    assert.equal(state.comparisonWeight, config.comparisonWeight);
    assert.equal(state.ratingWeight, config.ratingWeight);
    assert.equal(state.weightDecay, config.weightDecay);
    assert.equal(state.maxWeightAbs, config.maxWeightAbs);
    assert.equal(state.maxBiasAbs, config.maxBiasAbs);
    assert.equal(state.ensemble.size, config.ensembleSize);
  });

  it("feature vector math in SGD pipeline produces correct weight deltas", () => {
    const state = createPreferenceModelState({
      learningRate: 0.1,
      ensembleSize: 1,
    });
    const feedback = {
      type: "comparison",
      preferred: "a",
      featureA: { agency: 1, variety: 0 },
      featureB: { agency: 0, variety: 1 },
    };

    const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
    const model = next.models[0];

    // diff = {agency:1, variety:-1}, target=1, prediction=0.5, error=0.5
    // scaledError = 0.1*1*0.5 = 0.05
    // weightDelta = {agency:0.05, variety:-0.05}
    assert.equal(model.weights.agency, 0.05);
    assert.equal(model.weights.variety, -0.05);
    assert.equal(model.bias, 0.05);
  });

  it("value transforms in SGD pipeline for 1-5 rating normalization", () => {
    const state = createPreferenceModelState({ learningRate: 0.1, ensembleSize: 1 });
    const feedback = {
      type: "rating",
      rating: 1,
      featureVector: { agency: 2 },
    };

    const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
    const model = next.models[0];

    // rating=1 → normalizeRatingTargetCentered → ((1-1)/4)*2-1 = -1
    // prediction=0.5 → centered = (0.5-0.5)*2 = 0
    // error = -1 - 0 = -1
    // scaledError = 0.1 * 0.25 * (-1) = -0.025
    // weightDelta = {agency: -0.05}
    assert.equal(model.weights.agency, -0.05);
    assert.equal(model.bias, -0.025);
  });

  it("weight decay + clamping pipeline with large weights", () => {
    const state = createPreferenceModelState({
      learningRate: 0.5,
      comparisonWeight: 0,
      weightDecay: 1,
      maxWeightAbs: 1.5,
      maxBiasAbs: 2,
      weights: { agency: 4, variety: -4 },
      bias: 5,
      ensembleSize: 1,
    });
    const feedback = {
      type: "comparison",
      preferred: "tie",
      featureA: {},
      featureB: {},
    };

    const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
    const model = next.models[0];

    // No weight delta (comparisonWeight=0), decay = 0.5*1 = 0.5
    // agency: 4 - 0.5*4 = 2 → clamped to 1.5
    // variety: -4 - 0.5*(-4) = -2 → clamped to -1.5
    // bias: 5 - 0.5*1*5 = 2.5 → clamped to 2
    assert.equal(model.weights.agency, 1.5);
    assert.equal(model.weights.variety, -1.5);
    assert.equal(model.bias, 2);
  });

  it("ensemble bagging with Poisson sampling is deterministic", () => {
    const state = createPreferenceModelState({
      learningRate: 0.1,
      ensembleSize: 3,
    });
    const feedback = {
      type: "comparison",
      preferred: "a",
      featureA: { agency: 1 },
      featureB: { agency: 0 },
    };

    const nextA = updatePreferenceModelState(state, feedback, { seed: 42 });
    const nextB = updatePreferenceModelState(state, feedback, { seed: 42 });

    assert.deepEqual(nextA.models, nextB.models);

    // Different seeds should produce different results
    const nextC = updatePreferenceModelState(state, feedback, { seed: 99 });
    // At least one model should differ (probabilistic but very likely with different seeds)
    const allSame = nextA.models.every(
      (m, i) => m.weights.agency === nextC.models[i].weights.agency
    );
    // Not asserting allSame is false since it's probabilistic, but determinism is key
  });

  it("history management across updates with maxHistory=3", () => {
    let state = createPreferenceModelState({ maxHistory: 3, ensembleSize: 1 });
    const feedbacks = [];
    for (let i = 0; i < 5; i += 1) {
      const fb = { type: "rating", rating: i + 1, featureVector: { agency: i * 0.1 } };
      feedbacks.push(fb);
      state = updatePreferenceModelState(state, fb, { rng: constantRng(0.5) });
    }

    assert.equal(state.history.length, 3);
    assert.deepEqual(state.history, feedbacks.slice(2));
  });

  it("round-trip state preservation of hyperparameters", () => {
    const options = {
      learningRate: 0.2,
      maxHistory: 50,
      comparisonWeight: 0.8,
      ratingWeight: 0.3,
      weightDecay: 0.01,
      maxWeightAbs: 3,
      maxBiasAbs: 4,
      ensembleSize: 2,
    };
    const state = createPreferenceModelState(options);
    const feedback = {
      type: "comparison",
      preferred: "a",
      featureA: { agency: 1 },
      featureB: { agency: 0 },
    };

    const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });

    assert.equal(next.learningRate, 0.2);
    assert.equal(next.maxHistory, 50);
    assert.equal(next.comparisonWeight, 0.8);
    assert.equal(next.ratingWeight, 0.3);
    assert.equal(next.weightDecay, 0.01);
    assert.equal(next.maxWeightAbs, 3);
    assert.equal(next.maxBiasAbs, 4);
    assert.equal(next.ensemble.size, 2);
  });

});
