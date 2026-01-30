import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  safeLearningRate,
  resolveEnsembleSize,
  normalizeModelSnapshot,
  resolveRng,
  nextRandom,
  samplePoisson,
  applyWeightDecay,
  clampWeights,
  applyFeedbackUpdate,
} from "../../../../src/evaluation-analytics/preference-model/sgd-update.js";

function constantRng(value) {
  return { next() { return value; } };
}

describe("sgd-update", () => {
  describe("safeLearningRate", () => {
    it("returns value when finite", () => {
      assert.equal(safeLearningRate(0.1), 0.1);
    });

    it("returns default for NaN", () => {
      assert.equal(safeLearningRate(NaN), 0.05);
    });
  });

  describe("resolveEnsembleSize", () => {
    it("uses explicit size", () => {
      assert.equal(resolveEnsembleSize(3, 5), 3);
    });

    it("falls back to model count", () => {
      assert.equal(resolveEnsembleSize(undefined, 4), 4);
    });

    it("uses default when both missing", () => {
      assert.equal(resolveEnsembleSize(undefined, undefined), 5);
    });

    it("enforces minimum of 1", () => {
      assert.equal(resolveEnsembleSize(0, 0), 1);
    });
  });

  describe("normalizeModelSnapshot", () => {
    it("normalizes valid snapshot", () => {
      const result = normalizeModelSnapshot({ weights: { a: 1 }, bias: 0.5, sampleCount: 3 });
      assert.deepEqual(result, { weights: { a: 1 }, bias: 0.5, sampleCount: 3 });
    });

    it("handles null snapshot", () => {
      const result = normalizeModelSnapshot(null);
      assert.deepEqual(result, { weights: {}, bias: 0, sampleCount: 0 });
    });

    it("uses defaultSampleCount", () => {
      const result = normalizeModelSnapshot({}, 7);
      assert.equal(result.sampleCount, 7);
    });
  });

  describe("resolveRng", () => {
    it("returns provided rng", () => {
      const rng = { next: () => 0.5 };
      assert.strictEqual(resolveRng({ rng }), rng);
    });

    it("creates seeded rng from seed", () => {
      const rng = resolveRng({ seed: 42 });
      assert.equal(typeof rng.next, "function");
    });

    it("returns null when no rng options", () => {
      assert.equal(resolveRng({}), null);
    });
  });

  describe("nextRandom", () => {
    it("uses rng when provided", () => {
      assert.equal(nextRandom(constantRng(0.42)), 0.42);
    });

    it("uses Math.random when null", () => {
      const val = nextRandom(null);
      assert.ok(val >= 0 && val < 1);
    });
  });

  describe("samplePoisson", () => {
    it("returns 0 for lambda=0", () => {
      assert.equal(samplePoisson(0, constantRng(0.5)), 0);
    });

    it("returns non-negative integer for positive lambda", () => {
      const result = samplePoisson(1, constantRng(0.5));
      assert.ok(Number.isInteger(result));
      assert.ok(result >= 0);
    });

    it("returns 0 for NaN lambda", () => {
      assert.equal(samplePoisson(NaN, constantRng(0.5)), 0);
    });

    it("is deterministic with same rng", () => {
      const a = samplePoisson(1, constantRng(0.3));
      const b = samplePoisson(1, constantRng(0.3));
      assert.equal(a, b);
    });
  });

  describe("applyWeightDecay", () => {
    it("applies decay to weights", () => {
      const result = applyWeightDecay({ a: 10, b: -10 }, 0.5, 1);
      // decay = 0.5*1 = 0.5; a: 10 - 0.5*10 = 5; b: -10 - 0.5*(-10) = -5
      assert.equal(result.a, 5);
      assert.equal(result.b, -5);
    });

    it("returns original weights when decay is 0", () => {
      const weights = { a: 1 };
      assert.strictEqual(applyWeightDecay(weights, 0.1, 0), weights);
    });

    it("returns original weights when learningRate is 0", () => {
      const weights = { a: 1 };
      assert.strictEqual(applyWeightDecay(weights, 0, 0.5), weights);
    });
  });

  describe("clampWeights", () => {
    it("clamps all weights", () => {
      const result = clampWeights({ a: 10, b: -10 }, 5);
      assert.equal(result.a, 5);
      assert.equal(result.b, -5);
    });

    it("passes through weights within bounds", () => {
      const result = clampWeights({ a: 2, b: -2 }, 5);
      assert.equal(result.a, 2);
      assert.equal(result.b, -2);
    });
  });

  describe("applyFeedbackUpdate", () => {
    it("applies comparison feedback", () => {
      const model = { weights: {}, bias: 0, sampleCount: 0 };
      const feedback = {
        type: "comparison",
        preferred: "a",
        featureA: { agency: 1 },
        featureB: { agency: 0 },
      };
      const params = {
        learningRate: 0.1,
        comparisonWeight: 1,
        ratingWeight: 0.25,
        weightDecay: 0,
        maxWeightAbs: 5,
        maxBiasAbs: 5,
      };

      const result = applyFeedbackUpdate(model, feedback, params);
      assert.equal(result.weights.agency, 0.05);
      assert.equal(result.bias, 0.05);
      assert.equal(result.sampleCount, 1);
    });

    it("applies rating feedback", () => {
      const model = { weights: {}, bias: 0, sampleCount: 0 };
      const feedback = {
        type: "rating",
        rating: -0.5,
        featureVector: { agency: 1, pacing: 2 },
      };
      const params = {
        learningRate: 0.2,
        comparisonWeight: 1,
        ratingWeight: 0.25,
        weightDecay: 0,
        maxWeightAbs: 5,
        maxBiasAbs: 5,
      };

      const result = applyFeedbackUpdate(model, feedback, params);
      assert.equal(result.weights.agency, -0.025);
      assert.equal(result.weights.pacing, -0.05);
      assert.equal(result.bias, -0.025);
    });

    it("handles null model", () => {
      const result = applyFeedbackUpdate(null, { type: "comparison", preferred: "tie", featureA: {}, featureB: {} }, {
        learningRate: 0.1,
        comparisonWeight: 1,
        ratingWeight: 0.25,
        weightDecay: 0,
        maxWeightAbs: 5,
        maxBiasAbs: 5,
      });
      assert.equal(result.sampleCount, 1);
    });
  });
});
