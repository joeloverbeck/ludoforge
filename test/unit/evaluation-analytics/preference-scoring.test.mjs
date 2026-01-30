import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computePreferenceScore } from "../../../src/evaluation-analytics/preference-scoring.js";

describe("preference-scoring", () => {
  describe("computePreferenceScore", () => {
    it("returns sigmoid score and confidence", () => {
      const state = {
        weights: { agency: 1 },
        bias: 0,
      };
      const { score, confidence, pMean, pVar, uncertainty, bald } = computePreferenceScore(
        state,
        { agency: 1 }
      );
      const expectedScore = 1 / (1 + Math.exp(-1));

      assert.ok(Math.abs(score - expectedScore) < 1e-10);
      assert.ok(Math.abs(pMean - expectedScore) < 1e-10);
      assert.equal(pVar, 0);
      assert.equal(uncertainty, 0);
      assert.equal(bald, 0);
      assert.equal(confidence, 1);
    });

    it("returns 0.5 score and 0 confidence when weights are zero", () => {
      const state = {
        weights: {},
        bias: 0,
      };
      const { score, confidence, pMean, pVar, uncertainty, bald } = computePreferenceScore(
        state,
        { agency: 10 }
      );

      assert.equal(score, 0.5);
      assert.equal(confidence, 1);
      assert.equal(pMean, 0.5);
      assert.equal(pVar, 0);
      assert.equal(uncertainty, 0);
      assert.equal(bald, 0);
    });

    it("is bounded and ignores non-finite feature values", () => {
      const state = {
        weights: { agency: 2, pacing: 3 },
        bias: 0,
      };
      const { score, confidence, pMean, pVar, uncertainty, bald } = computePreferenceScore(
        state,
        {
        agency: Number.NaN,
        pacing: Number.POSITIVE_INFINITY,
        }
      );

      assert.ok(Number.isFinite(score));
      assert.ok(Number.isFinite(confidence));
      assert.ok(Number.isFinite(pMean));
      assert.ok(Number.isFinite(pVar));
      assert.ok(Number.isFinite(uncertainty));
      assert.ok(Number.isFinite(bald));
      assert.ok(score >= 0 && score <= 1);
      assert.ok(confidence >= 0 && confidence <= 1);
      assert.equal(score, 0.5);
    });
  });
});
