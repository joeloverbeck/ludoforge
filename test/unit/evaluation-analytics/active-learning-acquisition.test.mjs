import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectActiveLearningPairs } from "../../../src/evaluation-analytics/active-learning.js";

describe("active-learning acquisition", () => {
  it("ranks pairs by BALD/pVar descending", () => {
    const modelState = {
      models: [
        { weights: { x: 1 }, bias: 0, sampleCount: 0 },
        { weights: { x: -1 }, bias: 0, sampleCount: 0 },
      ],
    };
    const candidates = [
      { id: "a", featureVector: { x: 0 } },
      { id: "b", featureVector: { x: 1 } },
      { id: "c", featureVector: { x: 2 } },
    ];

    const [first] = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 1,
      uncertaintyThreshold: 0,
      diversityQuota: 0,
    });

    assert.equal(first.candidateA.id, "a");
    assert.equal(first.candidateB.id, "c");
  });

  it("selection is deterministic", () => {
    const modelState = {
      models: [
        { weights: { x: 1 }, bias: 0, sampleCount: 0 },
        { weights: { x: -1 }, bias: 0, sampleCount: 0 },
      ],
    };
    const candidates = [
      { id: "a", featureVector: { x: 0 } },
      { id: "b", featureVector: { x: 1 } },
      { id: "c", featureVector: { x: 2 } },
    ];

    const first = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 2,
      uncertaintyThreshold: 0,
      diversityQuota: 0,
    });
    const second = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 2,
      uncertaintyThreshold: 0,
      diversityQuota: 0,
    });

    assert.deepStrictEqual(first, second);
  });

  it("diversity quota still reserves underrepresented niches", () => {
    const modelState = {
      models: [
        { weights: { x: 1 }, bias: 0, sampleCount: 0 },
        { weights: { x: -1 }, bias: 0, sampleCount: 0 },
      ],
    };
    const candidates = [
      { id: "rare", featureVector: { x: 2 }, nicheId: "rare" },
      { id: "b", featureVector: { x: 0 }, nicheId: "common" },
      { id: "c", featureVector: { x: 1 }, nicheId: "common" },
    ];

    const [pair] = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 1,
      uncertaintyThreshold: 0,
      diversityQuota: 1,
    });

    assert.ok(pair.candidateA.nicheId === "rare" || pair.candidateB.nicheId === "rare");
  });
});
