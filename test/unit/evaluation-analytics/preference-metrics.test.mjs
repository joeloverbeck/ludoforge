import assert from "node:assert/strict";
import test from "node:test";

import { computePreferenceMetrics } from "../../../src/evaluation-analytics/preference-metrics.js";

function freezeComparison(sample) {
  Object.freeze(sample.featureA);
  Object.freeze(sample.featureB);
  return Object.freeze(sample);
}

test("computePreferenceMetrics returns accuracy and calibration buckets", () => {
  const state = Object.freeze({
    weights: Object.freeze({ agency: 1 }),
    bias: 0,
  });

  const samples = [
    freezeComparison({
      type: "comparison",
      preferred: "a",
      featureA: { agency: 1 },
      featureB: { agency: 0 },
    }),
    freezeComparison({
      type: "comparison",
      preferred: "b",
      featureA: { agency: 0 },
      featureB: { agency: 1 },
    }),
    freezeComparison({
      type: "comparison",
      preferred: "tie",
      featureA: { agency: 0 },
      featureB: { agency: 0 },
    }),
  ];

  const result = computePreferenceMetrics(state, samples);

  assert.equal(result.total, 3);
  assert.equal(result.correct, 2);
  assert.equal(result.ties, 1);
  assert.ok(Math.abs(result.accuracy - 2 / 3) < 1e-10);
  assert.equal(result.calibrationBuckets.length, 10);

  const lowBucket = result.calibrationBuckets[2];
  assert.equal(lowBucket.count, 1);
  assert.ok(lowBucket.averagePredicted > 0.2 && lowBucket.averagePredicted < 0.3);
  assert.equal(lowBucket.averageOutcome, 0);

  const midBucket = result.calibrationBuckets[5];
  assert.equal(midBucket.count, 1);
  assert.equal(midBucket.averagePredicted, 0.5);
  assert.equal(midBucket.averageOutcome, 0);

  const highBucket = result.calibrationBuckets[7];
  assert.equal(highBucket.count, 1);
  assert.ok(highBucket.averagePredicted > 0.7 && highBucket.averagePredicted < 0.8);
  assert.equal(highBucket.averageOutcome, 1);
});
