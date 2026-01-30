import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../../../src/evaluation-analytics/preference-model.js";

function constantRng(value) {
  return {
    next() {
      return value;
    },
  };
}

describe("preference-model", () => {
  describe("updatePreferenceModelState", () => {
    it("does not mutate prior state", () => {
      const initial = createPreferenceModelState({
        models: [{ weights: { agency: 1 }, bias: 0.5, sampleCount: 2 }],
        history: [
          { type: "rating", rating: 1, featureVector: { agency: 0.2 } },
        ],
      });

      const frozenWeights = { ...initial.models[0].weights };
      const frozenHistory = [...initial.history];
      Object.freeze(initial.models[0].weights);
      Object.freeze(initial.models);
      Object.freeze(initial.history);
      Object.freeze(initial);

      const next = updatePreferenceModelState(initial, {
        type: "rating",
        rating: 1,
        featureVector: { agency: 0.4 },
      }, { rng: constantRng(0.5) });

      assert.deepEqual(initial.models[0].weights, frozenWeights);
      assert.deepEqual(initial.history, frozenHistory);
      assert.notStrictEqual(next, initial);
    });

    it("applies bounded history", () => {
      let state = createPreferenceModelState({ maxHistory: 2 });
      const samples = [
        { type: "rating", rating: 1, featureVector: { agency: 0.2 } },
        { type: "rating", rating: -1, featureVector: { agency: 0.3 } },
        { type: "rating", rating: 0.5, featureVector: { agency: 0.4 } },
      ];

      for (const sample of samples) {
        state = updatePreferenceModelState(state, sample, { rng: constantRng(0.5) });
      }

      assert.equal(state.history.length, 2);
      assert.deepEqual(state.history, samples.slice(1));
    });

    it("updates weights from comparisons deterministically", () => {
      const state = createPreferenceModelState({ learningRate: 0.1, ensembleSize: 2 });
      const feedback = {
        type: "comparison",
        preferred: "a",
        featureA: { agency: 1, variety: 0 },
        featureB: { agency: 0, variety: 1 },
      };

      const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });

      for (const model of next.models) {
        assert.equal(model.weights.agency, 0.05);
        assert.equal(model.weights.variety, -0.05);
        assert.equal(model.bias, 0.05);
      }
    });

    it("updates weights from ratings", () => {
      const state = createPreferenceModelState({ learningRate: 0.2 });
      const feedback = {
        type: "rating",
        rating: -0.5,
        featureVector: { agency: 1, pacing: 2 },
      };

      const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
      const model = next.models[0];

      assert.equal(model.weights.agency, -0.025);
      assert.equal(model.weights.pacing, -0.05);
      assert.equal(model.bias, -0.025);
      assert.equal(next.sampleCount, 1);
    });

    it("maps 1-5 ratings into prediction error updates", () => {
      const state = createPreferenceModelState({ learningRate: 0.1 });
      const feedback = {
        type: "rating",
        rating: 1,
        featureVector: { agency: 2 },
      };

      const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
      const model = next.models[0];

      assert.equal(model.weights.agency, -0.05);
      assert.equal(model.bias, -0.025);
    });

    it("applies tie comparisons as neutral targets", () => {
      const state = createPreferenceModelState({ learningRate: 0.1 });
      const feedback = {
        type: "comparison",
        preferred: "tie",
        featureA: { agency: 1 },
        featureB: { agency: 0 },
      };

      const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
      const model = next.models[0];

      assert.equal(model.weights.agency ?? 0, 0);
      assert.equal(model.bias, 0);
    });

    it("applies weight decay and clamps", () => {
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

      const next = updatePreferenceModelState(state, feedback, { rng: constantRng(0.5) });
      const model = next.models[0];

      assert.equal(model.weights.agency, 1.5);
      assert.equal(model.weights.variety, -1.5);
      assert.equal(model.bias, 2);
    });

    it("is deterministic with seeded bagging", () => {
      const state = createPreferenceModelState({ learningRate: 0.1, ensembleSize: 3 });
      const feedback = {
        type: "comparison",
        preferred: "a",
        featureA: { agency: 1 },
        featureB: { agency: 0 },
      };

      const nextA = updatePreferenceModelState(state, feedback, { seed: 12345 });
      const nextB = updatePreferenceModelState(state, feedback, { seed: 12345 });

      assert.deepEqual(nextA, nextB);
    });
  });

  describe("createPreferenceModelState", () => {
    it("config defaults when inputs are invalid", () => {
      const created = createPreferenceModelState({
        comparisonWeight: Number.NaN,
        ratingWeight: Number.POSITIVE_INFINITY,
        weightDecay: Number.NaN,
        maxWeightAbs: Number.NaN,
        maxBiasAbs: Number.NaN,
        ensembleSize: Number.NaN,
      });

      assert.equal(created.comparisonWeight, 1);
      assert.equal(created.ratingWeight, 0.25);
      assert.equal(created.weightDecay, 0);
      assert.equal(created.maxWeightAbs, 5);
      assert.equal(created.maxBiasAbs, 5);
      assert.equal(created.ensemble.size, 5);

      const next = updatePreferenceModelState(
        { ...created, comparisonWeight: Number.NaN, ratingWeight: Number.NaN },
        { type: "comparison", preferred: "tie", featureA: {}, featureB: {} },
        { rng: constantRng(0.5) },
      );

      assert.equal(next.comparisonWeight, 1);
      assert.equal(next.ratingWeight, 0.25);
      assert.equal(next.weightDecay, 0);
      assert.equal(next.maxWeightAbs, 5);
      assert.equal(next.maxBiasAbs, 5);
    });
  });

  describe("config file defaults", () => {
    it("preference model defaults reflect config file", async () => {
      const configUrl = new URL("../../../configs/preference-model.json", import.meta.url);
      const config = JSON.parse(await readFile(configUrl, "utf8"));

      const created = createPreferenceModelState();

      assert.equal(created.learningRate, config.learningRate);
      assert.equal(created.ensemble.size, config.ensembleSize);
      assert.equal(created.maxHistory, config.maxHistory);
      assert.equal(created.comparisonWeight, config.comparisonWeight);
      assert.equal(created.ratingWeight, config.ratingWeight);
      assert.equal(created.weightDecay, config.weightDecay);
      assert.equal(created.maxWeightAbs, config.maxWeightAbs);
      assert.equal(created.maxBiasAbs, config.maxBiasAbs);
    });
  });
});
