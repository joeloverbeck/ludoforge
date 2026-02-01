import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeAdaptiveBudget } from "../../../src/evolution-runner/adaptive-budget.js";

function buildModelState(models) {
  return { models };
}

function buildCandidates(featureVector) {
  return [
    { featureVector },
    { featureVector },
  ];
}

describe("adaptive budget", () => {
  it("reduces budget when uncertainty is low", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 5, unfreezeRequired: false });
  });

  it("increases budget when uncertainty is high", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 5 }, bias: 0 },
      { weights: { x: -5 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.6,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 15, unfreezeRequired: false });
  });

  it("increases budget when new metric ids appear", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 15, unfreezeRequired: false });
  });

  it("keeps base budget when disabled", () => {
    const result = computeAdaptiveBudget({
      baseMaxSamples: 7,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      enabled: false,
    });

    assert.deepStrictEqual(result, { budget: 7, unfreezeRequired: false });
  });

  it("allows budget to reach zero", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 1,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 0, unfreezeRequired: false });
  });

  it("returns budget 0 when baseMaxSamples is 0", () => {
    const result = computeAdaptiveBudget({
      baseMaxSamples: 0,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 0, unfreezeRequired: false });
  });

  it("honors custom scaleDownFactor", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      scaleDownFactor: 0.3,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 3, unfreezeRequired: false });
  });

  it("honors custom scaleUpFactor", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 5 }, bias: 0 },
      { weights: { x: -5 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.6,
      scaleUpFactor: 2.0,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 20, unfreezeRequired: false });
  });

  it("signals unfreezeRequired when onNewMetricIds is forceUnfreeze", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      onNewMetricIds: "forceUnfreeze",
      enabled: true,
    });

    assert.strictEqual(result.unfreezeRequired, true);
    assert.strictEqual(result.budget, 15);
  });

  it("does not signal unfreezeRequired when onNewMetricIds is scaleUp", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      onNewMetricIds: "scaleUp",
      enabled: true,
    });

    assert.strictEqual(result.unfreezeRequired, false);
    assert.strictEqual(result.budget, 15);
  });

  it("uses custom scaleUpFactor for new metric ids path", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const result = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      scaleUpFactor: 2.0,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 20, unfreezeRequired: false });
  });

  it("returns budget 0 for baseMaxSamples=0 even with new metric ids", () => {
    const result = computeAdaptiveBudget({
      baseMaxSamples: 0,
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 0, unfreezeRequired: false });
  });

  it("defaults non-finite baseMaxSamples to 0", () => {
    const result = computeAdaptiveBudget({
      baseMaxSamples: NaN,
      enabled: true,
    });

    assert.deepStrictEqual(result, { budget: 0, unfreezeRequired: false });
  });
});
