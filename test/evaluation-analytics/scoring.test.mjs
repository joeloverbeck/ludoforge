import assert from "node:assert/strict";
import test from "node:test";

import { computeCompositeScore } from "../../src/evaluation-analytics/scoring.js";

test("computeCompositeScore normalizes weights without mutating inputs", () => {
  const featureVector = Object.freeze({ agency: 0.8, variety: 0.2 });
  const weights = Object.freeze({ agency: 2, variety: 1 });

  const result = computeCompositeScore(featureVector, { weights, includeComponents: false });

  assert.ok(Math.abs(result.score - (0.8 * 2 + 0.2 * 1) / 3) < 1e-9);
  assert.equal(result.components, undefined);
});

test("computeCompositeScore defaults to averaging feature values", () => {
  const featureVector = { agency: 0.1, variety: 0.3, coverage: 0.6 };

  const result = computeCompositeScore(featureVector, { includeComponents: false });

  assert.ok(Math.abs(result.score - (0.1 + 0.3 + 0.6) / 3) < 1e-9);
});

test("computeCompositeScore averages objective scores when weights are absent", () => {
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
