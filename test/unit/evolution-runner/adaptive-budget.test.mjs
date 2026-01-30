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

    const budget = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.equal(budget, 5);
  });

  it("increases budget when uncertainty is high", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 5 }, bias: 0 },
      { weights: { x: -5 }, bias: 0 },
    ]);

    const budget = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.6,
      enabled: true,
    });

    assert.equal(budget, 15);
  });

  it("increases budget when new metric ids appear", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const budget = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 10,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x", "y"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.equal(budget, 15);
  });

  it("keeps base budget when disabled", () => {
    const budget = computeAdaptiveBudget({
      baseMaxSamples: 7,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      enabled: false,
    });

    assert.equal(budget, 7);
  });

  it("never drops below one sample", () => {
    const preferenceModelState = buildModelState([
      { weights: { x: 1 }, bias: 0 },
      { weights: { x: 1 }, bias: 0 },
    ]);

    const budget = computeAdaptiveBudget({
      preferenceModelState,
      baseMaxSamples: 1,
      candidates: buildCandidates({ x: 1 }),
      metricIds: ["x"],
      previousMetricIds: ["x"],
      lowUncertaintyThreshold: 0.2,
      highUncertaintyThreshold: 0.8,
      enabled: true,
    });

    assert.equal(budget, 1);
  });
});
