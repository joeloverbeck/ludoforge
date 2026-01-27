import { test } from "node:test";
import assert from "node:assert/strict";

import { createPreferenceEvaluator } from "../../src/evolutionary-engine/preference-evaluator.js";

const preferenceModelState = Object.freeze({
  version: 1,
  weights: { novelty: 2 },
  bias: 0,
  sampleCount: 10,
  history: [],
  learningRate: 0.1,
  maxHistory: 100,
});

function buildAnalytics({ featureVector, compositeScore, degeneracy, descriptors }) {
  return {
    trajectorySummaries: [],
    metrics: [],
    degeneracy,
    featureVector,
    compositeScore,
    descriptors,
  };
}

test("preference evaluator includes preference scoring when allowed", () => {
  const descriptors = { length: 3 };
  const analytics = buildAnalytics({
    featureVector: { novelty: 1 },
    compositeScore: { score: 1 },
    degeneracy: { flags: [] },
    descriptors,
  });

  const evaluator = createPreferenceEvaluator(
    () => analytics,
    {
      preferenceModelState,
      preferenceCap: 1,
      preferenceWeight: 1,
    }
  );

  const result = evaluator({ id: "g-1" });
  const blend = result.diagnostics.preferenceFitness.diagnostics.blend;

  assert.equal(result.diagnostics.preferenceFitness.compositeScore.score, 1);
  assert.ok(blend.preference > 0);
  assert.ok(result.fitness > 1);
});

test("preference evaluator gates preference scoring on degeneracy rejection", () => {
  const analytics = buildAnalytics({
    featureVector: { novelty: 1 },
    compositeScore: { score: 1 },
    degeneracy: { flags: ["loop"] },
    descriptors: { length: 2 },
  });

  const evaluator = createPreferenceEvaluator(
    () => analytics,
    {
      preferenceModelState,
      preferenceCap: 1,
      preferenceWeight: 1,
    }
  );

  const result = evaluator({ id: "g-2" });
  const blend = result.diagnostics.preferenceFitness.diagnostics.blend;

  assert.equal(blend.preference, 0);
  assert.equal(result.fitness, 1);
});

test("preference evaluator passes descriptors through unchanged", () => {
  const descriptors = { length: 5, randomness: 0.2 };
  const analytics = buildAnalytics({
    featureVector: { novelty: 0.4 },
    compositeScore: { score: 0.6 },
    degeneracy: { flags: [] },
    descriptors,
  });

  const evaluator = createPreferenceEvaluator(() => analytics, { preferenceModelState });
  const result = evaluator({ id: "g-3" });

  assert.strictEqual(result.descriptors, descriptors);
  assert.deepEqual(result.descriptors, descriptors);
});
