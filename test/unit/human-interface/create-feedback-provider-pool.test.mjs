import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

let observedCandidateIds = null;

mock.module("../../../src/evaluation-analytics/active-learning.js", {
  namedExports: {
    selectActiveLearningPairs(candidates, _modelState, _options) {
      observedCandidateIds = candidates.map((c) => c.id);
      return [];
    },
  },
});

const { createFeedbackProvider } = await import(
  "../../../src/human-interface/create-feedback-provider.js"
);

function makeEvaluated(id, featureVector, fitness) {
  return {
    genome: { id },
    diagnostics: { featureVector },
    fitness: fitness ?? 1.0,
  };
}

function makeRng(seed) {
  let state = seed;
  return {
    nextInt(max) {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state % max;
    },
  };
}

describe("createFeedbackProvider with candidatePoolConfig", () => {
  it("uses resolveCandidatePool when candidatePoolConfig is provided", async () => {
    observedCandidateIds = null;

    const io = {
      readLine: async () => "",
      writeLine: () => {},
    };

    const provider = createFeedbackProvider({
      io,
      config: {
        mode: "comparison",
        maxSamplesPerGen: 10,
      },
      candidatePoolConfig: {
        source: "elites",
        focus: { strategy: "none" },
        maxCandidates: 10,
      },
    });

    const evaluated = [
      makeEvaluated("a", { x: 1 }, 2.0),
      makeEvaluated("b", { x: 2 }, 1.0),
      makeEvaluated("c", { x: 3 }, 3.0),
    ];
    const elites = [
      makeEvaluated("a", { x: 1 }, 2.0),
      makeEvaluated("c", { x: 3 }, 3.0),
    ];

    await provider.feedbackProvider({
      generation: 1,
      runId: "run-1",
      loopResult: {
        evaluated,
        elites,
        shortlist: [],
        rng: makeRng(42),
      },
    });

    // When source="elites", only elite candidates should be resolved
    assert.ok(observedCandidateIds !== null);
    assert.deepEqual(observedCandidateIds.sort(), ["a", "c"]);
  });

  it("falls back to extractCandidates when candidatePoolConfig is absent", async () => {
    observedCandidateIds = null;

    const io = {
      readLine: async () => "",
      writeLine: () => {},
    };

    const provider = createFeedbackProvider({
      io,
      config: {
        mode: "comparison",
        maxSamplesPerGen: 10,
      },
    });

    const evaluated = [
      makeEvaluated("a", { x: 1 }, 2.0),
      makeEvaluated("b", { x: 2 }, 1.0),
    ];

    await provider.feedbackProvider({
      generation: 1,
      runId: "run-1",
      loopResult: {
        evaluated,
      },
    });

    // Without candidatePoolConfig, all evaluated should be used
    assert.ok(observedCandidateIds !== null);
    assert.deepEqual(observedCandidateIds.sort(), ["a", "b"]);
  });

  it("falls back to extractCandidates when loopResult lacks elites", async () => {
    observedCandidateIds = null;

    const io = {
      readLine: async () => "",
      writeLine: () => {},
    };

    const provider = createFeedbackProvider({
      io,
      config: {
        mode: "comparison",
        maxSamplesPerGen: 10,
      },
      candidatePoolConfig: {
        source: "elites",
        focus: { strategy: "none" },
        maxCandidates: 10,
      },
    });

    const evaluated = [
      makeEvaluated("a", { x: 1 }, 2.0),
      makeEvaluated("b", { x: 2 }, 1.0),
    ];

    await provider.feedbackProvider({
      generation: 1,
      runId: "run-1",
      loopResult: {
        evaluated,
        // no elites or rng — should fall back
      },
    });

    assert.ok(observedCandidateIds !== null);
    assert.deepEqual(observedCandidateIds.sort(), ["a", "b"]);
  });
});
