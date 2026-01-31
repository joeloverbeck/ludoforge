import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeCoverageActions,
  computeCoverageState,
  computeEarlyTerminationRate,
  computeExtendedMetrics,
  computeLengthMean,
  computeLengthVariance,
  computeOutcomeVariance,
} from "../../../src/evaluation-analytics/metrics/extended.js";
import { createInitialState } from "../../../src/game-kernel/index.js";

function buildSummary({
  stepCount = 0,
  turnCount = 0,
  outcomes = { 1: "draw", 2: "draw" },
  terminationReason,
  terminated = true,
  actionCounts,
  keySteps,
  uniqueStateCount,
} = {}) {
  return {
    stepCount,
    turnCount,
    terminationReason,
    uniqueStateCount,
    terminated,
    terminalOutcome: { outcomes },
    actionCounts,
    keySteps,
  };
}

function getMetric(metrics, id) {
  const found = metrics.find((metric) => metric.id === id);
  assert.ok(found, `Expected metric ${id}`);
  return found.value;
}

function createScoringDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 }],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [],
      scoring: {
        perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } },
      },
    },
    triggers: [],
  };
}

function makeState(definition, scoresByPlayer) {
  const state = createInitialState(definition);
  for (const [playerId, score] of Object.entries(scoresByPlayer)) {
    state.variables.perPlayer[playerId].score = score;
  }
  return state;
}

function makeRun(steps) {
  return {
    trajectory: { steps },
    outcome: { outcomes: {} },
    terminationReason: "condition",
    terminated: true,
  };
}

describe("extended-metrics", () => {
  describe("length metrics", () => {
    it("computes mean, variance, and early termination rate", () => {
      const summaries = [
        buildSummary({ stepCount: 2 }),
        buildSummary({ stepCount: 4, terminationReason: "max-turns" }),
        buildSummary({ stepCount: 6, terminationReason: "stalemate" }),
      ];

      assert.ok(Math.abs(computeLengthMean(summaries) - 4) < 1e-9);
      assert.ok(Math.abs(computeLengthVariance(summaries) - 8 / 3) < 1e-9);
      assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 2 / 3) < 1e-9);
    });
  });

  describe("computeEarlyTerminationRate", () => {
    it("treats un-terminated outcomes as early exits", () => {
      const summaries = [
        buildSummary({ stepCount: 3, terminated: false }),
        buildSummary({ stepCount: 3 }),
      ];

      assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 0.5) < 1e-9);
    });

    it("excludes condition-based terminations", () => {
      const summaries = [
        buildSummary({ terminationReason: "condition" }),
        buildSummary({ terminationReason: "max-steps" }),
        buildSummary({ terminated: false }),
      ];

      assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 2 / 3) < 1e-9);
    });
  });

  describe("computeOutcomeVariance", () => {
    it("measures swinginess across runs", () => {
      const summaries = [
        buildSummary({ outcomes: { 1: "win", 2: "lose" } }),
        buildSummary({ outcomes: { 1: "lose", 2: "win" } }),
      ];

      assert.ok(Math.abs(computeOutcomeVariance(summaries) - 0.25) < 1e-9);
    });
  });

  describe("coverage metrics", () => {
    it("uses definition actions and state exploration proxies", () => {
      const definition = {
        version: "0.1.0",
        players: { count: 2 },
        state: { variables: [] },
        actions: [{ id: "a" }, { id: "b" }, { id: "c" }],
        turn: { scheduler: "round_robin" },
        termination: { conditions: [] },
      };

      const summaries = [
        buildSummary({
          stepCount: 8,
          actionCounts: { a: 2 },
          keySteps: [{ actionId: "b" }],
          uniqueStateCount: 4,
        }),
        buildSummary({
          stepCount: 6,
          actionCounts: { b: 1 },
          uniqueStateCount: 6,
        }),
      ];

      assert.ok(Math.abs(computeCoverageActions(definition, summaries) - 2 / 3) < 1e-9);
      assert.ok(Math.abs(computeCoverageState(summaries) - 0.75) < 1e-9);
    });
  });

  describe("computeExtendedMetrics", () => {
    it("returns bundle output", async () => {
      const definition = {
        version: "0.1.0",
        players: { count: 2 },
        state: { variables: [] },
        actions: [{ id: "a" }],
        turn: { scheduler: "round_robin" },
        termination: { conditions: [] },
      };

      const summaries = [buildSummary({ stepCount: 2, actionCounts: { a: 2 } })];
      const metrics = await computeExtendedMetrics(definition, summaries);

      assert.equal(getMetric(metrics, "length_mean"), 2);
      assert.equal(getMetric(metrics, "length_variance"), 0);
      assert.equal(getMetric(metrics, "early_termination_rate"), 0);
      assert.equal(getMetric(metrics, "outcome_variance"), 0);
      assert.equal(getMetric(metrics, "coverage_actions"), 1);
      assert.equal(getMetric(metrics, "coverage_state"), 0);
    });

    it("uses suite results for advantage_reversal_rate when suiteId is provided", async () => {
      const definition = createScoringDefinition();
      const summaries = [buildSummary({ stepCount: 2 })];
      const suiteRun = makeRun([
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1
        { state: makeState(definition, { 1: 1, 2: 5 }) }, // leader: 2 (change)
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1 (change)
      ]);
      const fallbackRun = makeRun([
        { state: makeState(definition, { 1: 5, 2: 1 }) },
        { state: makeState(definition, { 1: 6, 2: 2 }) },
      ]);
      const metrics = await computeExtendedMetrics(
        definition,
        summaries,
        {
          simulations: [fallbackRun],
          advantageReversal: { enabled: true, suiteId: "suite-a" },
        },
        { "suite-a": { results: [suiteRun] } }
      );

      assert.equal(getMetric(metrics, "advantage_reversal_rate"), 1);
    });
  });
});
