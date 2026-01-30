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

    const modelState = createPreferenceModelState({ weights: { x: 1 }, bias: 0 });
    const pairs = selectActiveLearningPairs(candidates, modelState, {
      maxPairs: 2,
      uncertaintyThreshold: 0,
      diversityQuota: 1,
    });

    assert.equal(pairs.length, 2);
    const hasUncertainPair = pairs.some((pair) => {
      const ids = [pair.candidateA.id, pair.candidateB.id].sort().join(":");
      return ids === "a:b";
    });
    const hasRare = pairs.some(
      (pair) => pair.candidateA.nicheId === "rare" || pair.candidateB.nicheId === "rare",
    );
    assert.ok(hasUncertainPair);
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
