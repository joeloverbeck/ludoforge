import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockFitness } from "./helpers/mock-fitness.js";

const preferenceModelState = Object.freeze({
  version: 1,
  weights: { novelty: 2 },
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

test("mock fitness deterministically maps evaluation artifacts", () => {
  const helper = createMockFitness({ preferenceModelState });
  const artifacts = {
    metrics: [
      { id: "novelty", value: 1 },
      { id: "variety", value: 0.2 },
    ],
    degeneracy: { flags: [] },
    descriptors: { length: 2 },
  };

  const first = helper.evaluate(artifacts);
  const second = helper.evaluate(artifacts);

  assert.deepEqual(first, second);
  assert.ok(Object.keys(first.featureVector).length > 0);
  assert.equal(first.descriptors.length, 2);
});

test("mock fitness can gate preference on degeneracy or safety", () => {
  const helper = createMockFitness({
    preferenceModelState,
    fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
  });

  const degeneracyResult = helper.evaluate(
    {
      metrics: [{ id: "novelty", value: 1 }],
      degeneracy: { flags: ["loop"] },
    },
    {
      gatePreferenceOnDegeneracy: true,
      degeneracyFilters: { rejectFlags: ["loop"] },
    }
  );

  const safetyResult = helper.evaluate(
    {
      metrics: [{ id: "novelty", value: 1 }],
      degeneracy: { flags: [] },
      safetyFailures: [{ name: "mock-gate", reason: "blocked" }],
    },
    {
      gatePreferenceOnSafety: true,
    }
  );

  assert.equal(degeneracyResult.diagnostics.preferenceFitness.diagnostics.blend.preference, 0);
  assert.equal(safetyResult.diagnostics.preferenceFitness.diagnostics.blend.preference, 0);
  assert.ok(Array.isArray(safetyResult.diagnostics.safetyFailures));
});
