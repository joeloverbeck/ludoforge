import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runSuites } from "../../../src/evaluation-analytics/suite-runner.js";
import { createRunCache } from "../../../src/simulation-engine/run-cache.js";

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeCache() {
  return createRunCache();
}

describe("runSuites", () => {
  it("returns empty object when no suites provided", () => {
    const result = runSuites({
      definition: choiceGame,
      suites: [],
      runsPerSuite: {},
      baseSeed: 42,
      cache: makeCache(),
    });
    assert.deepStrictEqual(result, {});
  });

  it("skips suites with zero or missing run count", () => {
    const result = runSuites({
      definition: choiceGame,
      suites: [{ id: "s1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" }],
      runsPerSuite: {},
      baseSeed: 42,
      cache: makeCache(),
    });
    assert.deepStrictEqual(result, {});
  });

  it("returns keyed results per suite with trajectory summaries", () => {
    const suites = [
      { id: "random-only", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const result = runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { "random-only": 2 },
      baseSeed: 42,
      cache: makeCache(),
    });
    assert.ok("random-only" in result);
    assert.ok(Array.isArray(result["random-only"].results));
    assert.equal(result["random-only"].results.length, 2);
    assert.ok(Array.isArray(result["random-only"].trajectorySummaries));
  });

  it("produces deterministic results for same seed", () => {
    const suites = [
      { id: "s1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const run1 = runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { s1: 3 },
      baseSeed: 99,
      cache: makeCache(),
    });
    const run2 = runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { s1: 3 },
      baseSeed: 99,
      cache: makeCache(),
    });
    assert.deepStrictEqual(run1, run2);
  });

  it("uses run cache to avoid duplicate simulations", () => {
    let simulationCount = 0;
    const cache = makeCache();

    // Override getOrRun to count actual executions
    const originalGetOrRun = cache.getOrRun;
    cache.getOrRun = (key, runFn) => {
      const had = cache._trackHas?.(key);
      const result = originalGetOrRun(key, () => {
        simulationCount += 1;
        return runFn();
      });
      return result;
    };

    const suites = [
      { id: "s1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];

    // Run twice with same cache — seeds are deterministic per (baseSeed, suiteId, runIndex)
    // so second call to runSuites with same params should hit cache
    runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { s1: 2 },
      baseSeed: 42,
      cache,
    });

    const countAfterFirst = simulationCount;

    runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { s1: 2 },
      baseSeed: 42,
      cache,
    });

    // Second batch should not have incremented simulation count (cache hit)
    assert.equal(simulationCount, countAfterFirst, "cache should prevent re-running simulations");
  });

  it("handles multiple suites independently", () => {
    const suites = [
      { id: "a", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
      { id: "b", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const result = runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { a: 1, b: 2 },
      baseSeed: 42,
      cache: makeCache(),
    });
    assert.ok("a" in result);
    assert.ok("b" in result);
    assert.equal(result.a.results.length, 1);
    assert.equal(result.b.results.length, 2);
  });

  it("uses fixed seed when seedPolicy is fixed", () => {
    const suites = [
      { id: "fixed1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "fixed", seed: 123 },
    ];
    const run1 = runSuites({
      definition: choiceGame,
      suites,
      runsPerSuite: { fixed1: 2 },
      baseSeed: 0,
      cache: makeCache(),
    });

    // With fixed seed, all runs in the suite use seed 123
    // So both runs produce identical results
    assert.deepStrictEqual(run1.fixed1.results[0], run1.fixed1.results[1]);
  });

  it("captures errors gracefully per suite", () => {
    // Definition that will cause simulation to fail
    const badDef = {
      version: "1.0",
      players: { count: 2 },
      state: {
        variables: [
          { id: "v", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
      },
      actions: [
        {
          id: "dec_v",
          actor: "player",
          effects: [{ kind: "dec", target: { kind: "var", id: "v" }, amount: 1 }],
        },
      ],
      turn: { scheduler: "round_robin" },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp", op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "v" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "win", players: "active" },
          },
        ],
        maxTurns: 50,
      },
    };

    const suites = [
      { id: "bad", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const result = runSuites({
      definition: badDef,
      suites,
      runsPerSuite: { bad: 1 },
      baseSeed: 42,
      cache: makeCache(),
    });

    assert.ok("bad" in result);
    assert.equal(typeof result.bad.error, "string");
  });
});
