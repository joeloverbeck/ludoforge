import assert from "node:assert/strict";
import test from "node:test";
import { selectActiveLearningPairs } from "../../src/evaluation-analytics/active-learning.js";

const baseModelState = {
  version: 1,
  weights: { x: 1 },
  bias: 0,
  sampleCount: 0,
  history: [],
  learningRate: 0.05,
  maxHistory: 100,
};

test("selection is deterministic and does not mutate inputs", () => {
  const candidates = [
    { id: "a", featureVector: { x: 0 }, nicheId: "n1" },
    { id: "b", featureVector: { x: 1 }, nicheId: "n1" },
    { id: "c", featureVector: { x: 2 }, nicheId: "n2" },
  ];
  const snapshot = JSON.parse(JSON.stringify(candidates));

  const first = selectActiveLearningPairs(candidates, baseModelState, {
    maxPairs: 2,
    uncertaintyThreshold: 0.6,
    diversityQuota: 0,
  });
  const second = selectActiveLearningPairs(candidates, baseModelState, {
    maxPairs: 2,
    uncertaintyThreshold: 0.6,
    diversityQuota: 0,
  });

  assert.deepStrictEqual(first, second);
  assert.deepStrictEqual(candidates, snapshot);
});

test("uncertainty ranking favors pairs closest to 0.5", () => {
  const candidates = [
    { id: "a", featureVector: { x: 0 } },
    { id: "b", featureVector: { x: 1 } },
    { id: "c", featureVector: { x: 2 } },
  ];

  const [pair] = selectActiveLearningPairs(candidates, baseModelState, {
    maxPairs: 1,
    uncertaintyThreshold: 1,
    diversityQuota: 0,
  });

  assert.equal(pair.candidateA.id, "a");
  assert.equal(pair.candidateB.id, "b");
});

test("diversity quota includes underrepresented niches", () => {
  const candidates = [
    { id: "rare", featureVector: { x: 5 }, nicheId: "rare" },
    { id: "b", featureVector: { x: 0 }, nicheId: "common" },
    { id: "c", featureVector: { x: 0.1 }, nicheId: "common" },
  ];

  const [pair] = selectActiveLearningPairs(candidates, baseModelState, {
    maxPairs: 1,
    uncertaintyThreshold: 0.05,
    diversityQuota: 1,
  });

  assert.ok(
    pair.candidateA.nicheId === "rare" || pair.candidateB.nicheId === "rare"
  );
});
