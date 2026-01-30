import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import { combineFitnessScores, computeCompositeScore } from "../../../src/evaluation-analytics/scoring.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

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

    it("ignores zero-weight degeneracy flags in composite score", async () => {
      const config = await readJson("../../../configs/fitness.json");

      assert.equal(config.weights["degeneracy.loop"], 0);

      const baseVector = {
        agency: 0.5,
        variety: 0.5,
        "degeneracy.loop": 0,
      };
      const degenerateVector = { ...baseVector, "degeneracy.loop": 1 };

      const baseScore = computeCompositeScore(baseVector, {
        weights: config.weights,
        normalizeWeights: config.weightNormalization,
        includeComponents: false,
      });
      const degenerateScore = computeCompositeScore(degenerateVector, {
        weights: config.weights,
        normalizeWeights: config.weightNormalization,
        includeComponents: false,
      });

      assert.ok(Math.abs(baseScore.score - degenerateScore.score) < 1e-9);
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

    it("damps preference contribution by (1 - uncertainty)", () => {
      const opts = {
        preferenceCap: 0.5,
        preferenceBootstrapSamples: 0,
      };
      // preferenceScore=1 → centered=1, weight=1, no uncertainty → contribution = cap
      const confident = combineFitnessScores(0, 1, 0, {
        ...opts,
        preferenceUncertainty: 0,
      });
      assert.equal(confident.components.preference, 0.5);

      // Same inputs but full uncertainty → contribution = 0
      const uncertain = combineFitnessScores(0, 1, 0, {
        ...opts,
        preferenceUncertainty: 1,
      });
      assert.equal(uncertain.components.preference, 0);
    });

    it("partially damps preference at intermediate uncertainty", () => {
      // preferenceScore=1 → centered=(1-0.5)*2=1, weight=1, uncertainty=0.5
      // weighted = 1 * 1 * (1 - 0.5) = 0.5 → clamped to min(0.5, cap=1) = 0.5
      const result = combineFitnessScores(0, 1, 0, {
        preferenceCap: 1,
        preferenceBootstrapSamples: 0,
        preferenceUncertainty: 0.5,
      });
      assert.ok(Math.abs(result.components.preference - 0.5) < 1e-9);
    });

    it("clamps uncertainty to [0, 1] range", () => {
      const opts = {
        preferenceCap: 0.5,
        preferenceBootstrapSamples: 0,
      };
      // Negative uncertainty treated as 0 → full contribution
      const negativeUncertainty = combineFitnessScores(0, 1, 0, {
        ...opts,
        preferenceUncertainty: -0.5,
      });
      assert.equal(negativeUncertainty.components.preference, 0.5);

      // Uncertainty > 1 treated as 1 → zero contribution
      const overUncertainty = combineFitnessScores(0, 1, 0, {
        ...opts,
        preferenceUncertainty: 2,
      });
      assert.equal(overUncertainty.components.preference, 0);
    });

    it("preserves old behavior when preferenceUncertainty is absent", () => {
      // No preferenceUncertainty option → defaults to 0 → no damping
      const result = combineFitnessScores(0, 1, 0, {
        preferenceCap: 0.5,
        preferenceBootstrapSamples: 0,
      });
      assert.equal(result.components.preference, 0.5);
    });
  });
});
