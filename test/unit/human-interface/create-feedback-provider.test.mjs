import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

let observedMaxPairs = null;

mock.module("../../../src/evaluation-analytics/active-learning.js", {
  namedExports: {
    selectActiveLearningPairs(_candidates, _modelState, options) {
      observedMaxPairs = options?.maxPairs ?? null;
      return [];
    },
  },
});

const { createFeedbackProvider } = await import(
  "../../../src/human-interface/create-feedback-provider.js"
);

function makeCandidate(id, featureVector) {
  return {
    genome: { id },
    diagnostics: { featureVector },
  };
}

describe("createFeedbackProvider", () => {
  it("uses adaptive budget when selecting active learning pairs", async () => {
    observedMaxPairs = null;

    const io = {
      readLine: async () => "",
      writeLine: () => {},
    };

    const provider = createFeedbackProvider({
      io,
      config: {
        mode: "comparison",
        maxSamplesPerGen: 10,
        adaptiveBudget: {
          enabled: true,
          lowUncertaintyThreshold: 0.2,
          highUncertaintyThreshold: 0.8,
        },
      },
      initialModelState: {
        models: [
          { weights: { x: 1 }, bias: 0 },
          { weights: { x: 1 }, bias: 0 },
        ],
      },
    });

    await provider.feedbackProvider({
      generation: 1,
      runId: "run-1",
      loopResult: {
        evaluated: [
          makeCandidate("a", { x: 1 }),
          makeCandidate("b", { x: 1 }),
        ],
      },
    });

    assert.equal(observedMaxPairs, 5);
  });
});
