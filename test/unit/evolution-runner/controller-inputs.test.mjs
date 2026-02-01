import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeControllerInputs } from "../../../src/evolution-runner/controller-inputs.js";

function makeEvaluated(featureVectors) {
  return featureVectors.map((fv, i) => ({
    genome: { id: `g-${i}` },
    diagnostics: { featureVector: fv },
  }));
}

describe("computeControllerInputs", () => {
  it("returns defaults when evaluated is empty", () => {
    const result = computeControllerInputs({
      evaluated: [],
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: null,
    });
    assert.equal(result.totalSamples, 0);
    assert.equal(result.meanUncertainty, 0);
    assert.equal(result.hasNewMetricIds, false);
    assert.deepEqual(result.metricIds, []);
  });

  it("passes totalSamples through unchanged", () => {
    const result = computeControllerInputs({
      evaluated: [],
      preferenceModelState: null,
      totalSamples: 42,
      previousMetricIds: null,
    });
    assert.equal(result.totalSamples, 42);
  });

  it("extracts sorted metric IDs from evaluated entries", () => {
    const evaluated = makeEvaluated([
      { beta: 1, alpha: 2 },
      { gamma: 3, alpha: 4 },
    ]);
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: null,
    });
    assert.deepEqual(result.metricIds, ["alpha", "beta", "gamma"]);
  });

  it("detects new metric IDs when previous is provided", () => {
    const evaluated = makeEvaluated([{ alpha: 1, beta: 2 }]);
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: ["alpha"],
    });
    assert.equal(result.hasNewMetricIds, true);
  });

  it("reports no new metric IDs when all are known", () => {
    const evaluated = makeEvaluated([{ alpha: 1, beta: 2 }]);
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: ["alpha", "beta", "gamma"],
    });
    assert.equal(result.hasNewMetricIds, false);
  });

  it("reports no new metric IDs when previousMetricIds is null", () => {
    const evaluated = makeEvaluated([{ alpha: 1 }]);
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: null,
    });
    assert.equal(result.hasNewMetricIds, false);
  });

  it("computes meanUncertainty as 0 when no preference model state", () => {
    const evaluated = makeEvaluated([{ alpha: 1 }]);
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: null,
    });
    assert.equal(result.meanUncertainty, 0);
  });

  it("handles evaluated entries with missing diagnostics gracefully", () => {
    const evaluated = [
      { genome: { id: "g-0" }, diagnostics: null },
      { genome: { id: "g-1" } },
    ];
    const result = computeControllerInputs({
      evaluated,
      preferenceModelState: null,
      totalSamples: 5,
      previousMetricIds: null,
    });
    assert.equal(result.totalSamples, 5);
    assert.equal(result.meanUncertainty, 0);
    assert.deepEqual(result.metricIds, []);
  });

  it("handles null evaluated gracefully", () => {
    const result = computeControllerInputs({
      evaluated: null,
      preferenceModelState: null,
      totalSamples: 0,
      previousMetricIds: null,
    });
    assert.deepEqual(result.metricIds, []);
    assert.equal(result.meanUncertainty, 0);
    assert.equal(result.hasNewMetricIds, false);
  });
});
