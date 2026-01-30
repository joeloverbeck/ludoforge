import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

const runBatchSimulations = mock.fn(() => {
  throw new Error("runBatchSimulations should not be called when suite results are available");
});

mock.module("../../../src/simulation-engine/index.js", {
  namedExports: {
    createGreedyPolicy() {
      return { selectAction: () => null };
    },
    createRandomPolicy() {
      return { selectAction: () => null };
    },
    createSeededRng() {
      return { nextInt: () => 0 };
    },
    runBatchSimulations,
  },
});

const { computePolicySensitivity } = await import(
  "../../../src/evaluation-analytics/metrics/extended/policy-sensitivity.js"
);

describe("policy-sensitivity suite routing", () => {
  it("uses suite results instead of spawning simulations", () => {
    const definition = { version: "1.0", players: { count: 2 }, actions: [], turn: {}, termination: {} };
    const suiteResults = {
      "random-greedy": {
        agents: [{ kind: "random" }, { kind: "greedy" }],
        results: [
          { outcome: { outcomes: { 1: "lose", 2: "win" } } },
          { outcome: { outcomes: { 1: "lose", 2: "win" } } },
        ],
      },
      "greedy-random": {
        agents: [{ kind: "greedy" }, { kind: "random" }],
        results: [
          { outcome: { outcomes: { 1: "win", 2: "lose" } } },
          { outcome: { outcomes: { 1: "win", 2: "lose" } } },
        ],
      },
    };

    const result = computePolicySensitivity(definition, {
      enabled: true,
      agentTiers: ["random", "greedy"],
      matchesPerSeat: 2,
      seed: null,
      suiteResults,
    });

    assert.equal(result, 1);
    assert.equal(runBatchSimulations.mock.calls.length, 0);
  });
});
