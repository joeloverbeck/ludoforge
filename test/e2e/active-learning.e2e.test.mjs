import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectActiveLearningPairs } from "../../src/evaluation-analytics/active-learning.js";
import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../../src/evaluation-analytics/preference-model.js";
import { createMockHumanEval } from "./helpers/mock-human-eval.js";

describe("active-learning", () => {
  it("active learning pairs drive comparison updates", () => {
    const candidates = [
      { id: "a", featureVector: { x: 0 }, nicheId: "common" },
      { id: "b", featureVector: { x: 0.05 }, nicheId: "common" },
      { id: "c", featureVector: { x: 3 }, nicheId: "rare" },
    ];

    const modelState = createPreferenceModelState({
      models: [
        { weights: { x: 1 }, bias: 0, sampleCount: 0 },
        { weights: { x: -1 }, bias: 0, sampleCount: 0 },
      ],
    });
    const [mostInformative] = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 1,
      uncertaintyThreshold: 0,
      diversityQuota: 0,
    });
    assert.equal(mostInformative.candidateA.id, "a");
    assert.equal(mostInformative.candidateB.id, "c");

    const pairs = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 2,
      uncertaintyThreshold: 0,
      diversityQuota: 1,
    });

    assert.equal(pairs.length, 2);
    const hasRare = pairs.some(
      (pair) => pair.candidateA.nicheId === "rare" || pair.candidateB.nicheId === "rare",
    );
    assert.ok(hasRare);

    const humanEval = createMockHumanEval({ seed: 11 });
    const updated = pairs.reduce((state, pair) => {
      const feedback = humanEval.compareCandidates(pair.candidateA, pair.candidateB);
      return updatePreferenceModelState(state, feedback);
    }, modelState);

    assert.equal(updated.sampleCount, modelState.sampleCount + pairs.length);
    assert.equal(updated.version, modelState.version + pairs.length);
  });
});
