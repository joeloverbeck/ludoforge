import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computePreferenceScore } from "../../../src/evaluation-analytics/preference-scoring.js";

describe("preference-scoring uncertainty", () => {
  it("returns zero uncertainty for identical models", () => {
    const state = {
      models: [
        { weights: { agency: 1 }, bias: 0, sampleCount: 1 },
        { weights: { agency: 1 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = computePreferenceScore(state, { agency: 1 });

    assert.equal(result.pVar, 0);
    assert.equal(result.uncertainty, 0);
    assert.equal(result.bald, 0);
  });

  it("returns positive uncertainty when models diverge", () => {
    const state = {
      models: [
        { weights: { agency: 1 }, bias: 0, sampleCount: 1 },
        { weights: { agency: -1 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = computePreferenceScore(state, { agency: 1 });

    assert.ok(result.pVar > 0);
    assert.ok(result.uncertainty > 0);
    assert.ok(result.bald >= 0);
    assert.ok(Math.abs(result.pMean - 0.5) < 1e-10);
  });

  it("returns neutral values for empty state", () => {
    const result = computePreferenceScore(null, { agency: 1 });

    assert.equal(result.score, 0.5);
    assert.equal(result.confidence, 0);
    assert.equal(result.pMean, 0.5);
    assert.equal(result.pVar, 0);
    assert.equal(result.uncertainty, 1);
    assert.equal(result.bald, 0);
  });
});
