import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockHumanEval } from "./helpers/mock-human-eval.js";

const candidates = [
  { id: "game-alpha", featureVector: { agency: 0.4, depth: 0.7 } },
  { id: "game-beta", featureVector: { agency: 0.2, depth: 0.9 } },
];

test("mock human eval ratings are deterministic and tied to candidate ids", () => {
  const helper = createMockHumanEval({ seed: 41 });
  const helperAlt = createMockHumanEval({ seed: 41 });

  const first = helper.rateCandidate(candidates[0]);
  const second = helper.rateCandidate(candidates[1]);
  const firstRepeat = helperAlt.rateCandidate(candidates[0]);

  assert.equal(first.candidateId, "game-alpha");
  assert.equal(second.candidateId, "game-beta");
  assert.deepEqual(first, firstRepeat);
  assert.ok(first.feedback.rating >= 1 && first.feedback.rating <= 5);
});

test("mock human eval comparisons preserve ids and invert when swapped", () => {
  const helper = createMockHumanEval({ seed: 19 });

  const comparison = helper.compareCandidates(candidates[0], candidates[1]);
  const swapped = helper.compareCandidates(candidates[1], candidates[0]);

  assert.equal(comparison.gameAId, "game-alpha");
  assert.equal(comparison.gameBId, "game-beta");
  if (comparison.preferred === "tie") {
    assert.equal(swapped.preferred, "tie");
    assert.ok(!("winnerId" in comparison));
  } else {
    const expected = comparison.preferred === "a" ? "b" : "a";
    assert.equal(swapped.preferred, expected);
    assert.ok([comparison.gameAId, comparison.gameBId].includes(comparison.winnerId));
  }
});
