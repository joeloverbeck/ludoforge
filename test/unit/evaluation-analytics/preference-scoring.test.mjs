import assert from "node:assert/strict";
import test from "node:test";

import { computePreferenceScore } from "../../../src/evaluation-analytics/preference-scoring.js";

test("computePreferenceScore returns sigmoid score and confidence", () => {
  const state = {
    weights: { agency: 1 },
    bias: 0,
  };
  const { score, confidence } = computePreferenceScore(state, { agency: 1 });
  const expectedScore = 1 / (1 + Math.exp(-1));

  assert.ok(Math.abs(score - expectedScore) < 1e-10);
  assert.ok(Math.abs(confidence - Math.abs(score - 0.5) * 2) < 1e-10);
});

test("computePreferenceScore returns 0.5 score and 0 confidence when weights are zero", () => {
  const state = {
    weights: {},
    bias: 0,
  };
  const { score, confidence } = computePreferenceScore(state, { agency: 10 });

  assert.equal(score, 0.5);
  assert.equal(confidence, 0);
});

test("computePreferenceScore is bounded and ignores non-finite feature values", () => {
  const state = {
    weights: { agency: 2, pacing: 3 },
    bias: 0,
  };
  const { score, confidence } = computePreferenceScore(state, {
    agency: Number.NaN,
    pacing: Number.POSITIVE_INFINITY,
  });

  assert.ok(Number.isFinite(score));
  assert.ok(Number.isFinite(confidence));
  assert.ok(score >= 0 && score <= 1);
  assert.ok(confidence >= 0 && confidence <= 1);
  assert.equal(score, 0.5);
});
