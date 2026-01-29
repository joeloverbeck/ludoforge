import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { combineFitnessScores, computeCompositeScore } from "../../../src/evaluation-analytics/scoring.js";

describe("scoring", () => {
  describe("computeCompositeScore", () => {
    it("normalizes weights without mutating inputs", () => {
      const featureVector = Object.freeze({ agency: 0.8, variety: 0.2 });
      const weights = Object.freeze({ agency: 2, variety: 1 });

      const result = computeCompositeScore(featureVector, { weights, includeComponents: false });

      assert.ok(Math.abs(result.score - (0.8 * 2 + 0.2 * 1) / 3) < 1e-9);
      assert.equal(result.components, undefined);
    });

    it("defaults to averaging feature values", () => {
      const featureVector = { agency: 0.1, variety: 0.3, coverage: 0.6 };

      const result = computeCompositeScore(featureVector, { includeComponents: false });

      assert.ok(Math.abs(result.score - (0.1 + 0.3 + 0.6) / 3) < 1e-9);
    });

    it("averages objective scores when weights are absent", () => {
      const featureVector = { offense: 1, defense: 0 };
      const objectives = {
        offense_focus: { offense: 1 },
        defense_focus: { defense: 1 },
      };

      const result = computeCompositeScore(featureVector, {
        objectives,
        objectiveDefaultWeight: 0,
        includeComponents: false,
      });

      assert.deepEqual(result.objectives, { offense_focus: 1, defense_focus: 0 });
      assert.ok(Math.abs(result.score - 0.5) < 1e-9);
    });

    it("honors per-feature default weights", () => {
      const featureVector = { agency: 0.2, interaction_rate: 0.9 };

      const result = computeCompositeScore(featureVector, {
        defaultWeights: { interaction_rate: 0 },
        includeComponents: false,
      });

      assert.ok(Math.abs(result.score - 0.2) < 1e-9);
    });

    it("applies defaultWeights when weights omit a feature", () => {
      const featureVector = { agency: 0.4, interaction_rate: 0.8 };

      const result = computeCompositeScore(featureVector, {
        weights: { agency: 1 },
        defaultWeights: { interaction_rate: 0 },
        includeComponents: false,
      });

      assert.ok(Math.abs(result.score - 0.4) < 1e-9);
    });
  });

  describe("combineFitnessScores", () => {
    it("caps preference influence during bootstrap", () => {
      const result = combineFitnessScores(1, 1, 0, {
        preferenceCap: 0.4,
        preferenceBootstrapCap: 0.1,
        preferenceBootstrapSamples: 5,
        preferenceSampleCount: 2,
      });

      assert.equal(result.components.preferenceCap, 0.1);
      assert.equal(result.components.preference, 0.1);
      assert.equal(result.score, 1.1);
    });

    it("uses full cap after bootstrap threshold", () => {
      const result = combineFitnessScores(1, 0, 0, {
        preferenceCap: 0.4,
        preferenceBootstrapCap: 0.1,
        preferenceBootstrapSamples: 5,
        preferenceSampleCount: 5,
      });

      assert.equal(result.components.preferenceCap, 0.4);
      assert.equal(result.components.preference, -0.4);
      assert.equal(result.score, 0.6);
    });

    it("skips preference when disabled and applies diversity weight", () => {
      const result = combineFitnessScores(0.5, 1, 0.2, {
        allowPreference: false,
        diversityWeight: 2,
      });

      assert.equal(result.components.preference, 0);
      assert.equal(result.components.diversity, 0.4);
      assert.equal(result.score, 0.9);
    });

    it("subtracts degeneracyPenalty from score", () => {
      const result = combineFitnessScores(1, null, 0, {
        degeneracyPenalty: 0.3,
      });

      assert.equal(result.components.degeneracyPenalty, 0.3);
      assert.ok(Math.abs(result.score - 0.7) < 1e-9);
    });

    it("defaults degeneracyPenalty to 0", () => {
      const result = combineFitnessScores(1, null, 0, {});

      assert.equal(result.components.degeneracyPenalty, 0);
      assert.equal(result.score, 1);
    });
  });
});
