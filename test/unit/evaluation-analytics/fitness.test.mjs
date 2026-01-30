import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computePreferenceAwareFitness } from "../../../src/evaluation-analytics/fitness.js";

describe("fitness", () => {
  describe("computePreferenceAwareFitness", () => {
    it("uses model sample count to lift bootstrap cap", () => {
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

    it("skips preference scoring when gated", () => {
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

    it("reports diagnostics when preference is available", () => {
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
  });

  describe("uncertainty-damped fitness blending", () => {
    it("damps preference toward zero when ensemble uncertainty is high", () => {
      const featureVector = Object.freeze({ agency: 1 });
      // Ensemble with deliberately split weights → high uncertainty
      const preferenceModelState = Object.freeze({
        models: [
          { weights: { agency: 5 }, bias: 0, sampleCount: 20 },
          { weights: { agency: -5 }, bias: 0, sampleCount: 20 },
        ],
        ensemble: { size: 2, method: "online-bagging" },
        version: 1,
      });

      const result = computePreferenceAwareFitness(featureVector, {
        compositeScore: { score: 0, components: {} },
        preferenceModelState,
        preferenceCap: 1,
        preferenceBootstrapSamples: 0,
      });

      assert.ok(result.diagnostics.preferenceUncertainty > 0.5,
        `uncertainty should be high, got ${result.diagnostics.preferenceUncertainty}`);
      // With high uncertainty, preference contribution should be damped
      assert.ok(Math.abs(result.diagnostics.blend.preference) < 0.5,
        `preference should be damped, got ${result.diagnostics.blend.preference}`);
    });

    it("preserves full preference when ensemble uncertainty is zero", () => {
      const featureVector = Object.freeze({ agency: 1 });
      // All identical models → zero uncertainty
      const preferenceModelState = Object.freeze({
        models: [
          { weights: { agency: 2 }, bias: 0, sampleCount: 20 },
          { weights: { agency: 2 }, bias: 0, sampleCount: 20 },
          { weights: { agency: 2 }, bias: 0, sampleCount: 20 },
        ],
        ensemble: { size: 3, method: "online-bagging" },
        version: 1,
      });

      const result = computePreferenceAwareFitness(featureVector, {
        compositeScore: { score: 0, components: {} },
        preferenceModelState,
        preferenceCap: 1,
        preferenceBootstrapSamples: 0,
      });

      assert.equal(result.diagnostics.preferenceUncertainty, 0);
      // pMean = sigmoid(2*1 + 0) ≈ 0.88 → centered ≈ 0.76 → full contribution
      assert.ok(result.diagnostics.blend.preference > 0.5,
        `preference should be significant, got ${result.diagnostics.blend.preference}`);
    });

    it("includes preferenceUncertainty in diagnostics", () => {
      const featureVector = { agency: 0.5 };
      const preferenceModelState = {
        models: [
          { weights: { agency: 1 }, bias: 0, sampleCount: 10 },
          { weights: { agency: -1 }, bias: 0, sampleCount: 10 },
        ],
        ensemble: { size: 2, method: "online-bagging" },
        version: 1,
      };

      const result = computePreferenceAwareFitness(featureVector, {
        compositeScore: { score: 0, components: {} },
        preferenceModelState,
      });

      assert.ok(Number.isFinite(result.diagnostics.preferenceUncertainty));
      assert.ok(result.diagnostics.preferenceUncertainty >= 0);
      assert.ok(result.diagnostics.preferenceUncertainty <= 1);
    });

    it("reports null preferenceUncertainty when no model state", () => {
      const result = computePreferenceAwareFitness({ agency: 1 }, {
        compositeScore: { score: 1, components: {} },
      });

      assert.equal(result.diagnostics.preferenceUncertainty, null);
    });
  });

  describe("degeneracy penalty integration", () => {
    it("subtracts degeneracy penalty when report provided", () => {
      const featureVector = Object.freeze({ agency: 1 });
      const degeneracyReport = {
        flags: ["no-choices"],
        ratios: {},
      };

      const result = computePreferenceAwareFitness(featureVector, {
        compositeScore: { score: 1, components: {} },
        degeneracyReport,
      });

      assert.ok(result.diagnostics.degeneracyPenalty > 0, "penalty must be positive");
      assert.ok(result.score < 1, "score must be reduced by penalty");
      assert.equal(result.diagnostics.blend.degeneracyPenalty, result.diagnostics.degeneracyPenalty);
    });
  });
});
