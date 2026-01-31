import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeAgency,
  computeCoreMetrics,
  computeCostAbortRate,
  computeInteractionRate,
  computeNoLegalActionsTerminationRate,
  computePacingTension,
  computePassStepRate,
  computeSkillExpression,
  computeSkippedTriggerRate,
  computeStrategicDepth,
  computeTurnTakingRate,
  computeVariety,
} from "../../../src/evaluation-analytics/metrics/core.js";

function buildSummary({
  stepCount = 0,
  turnCount = 0,
  outcomes = { 1: "draw", 2: "draw" },
  actionCounts,
  keySteps,
  totalSkippedTriggers,
  totalAttemptedTriggers,
  totalCostAborts,
  totalPassSteps,
  totalActionSteps,
  terminationReason,
} = {}) {
  const summary = {
    stepCount,
    turnCount,
    terminalOutcome: { outcomes },
    terminated: true,
    actionCounts,
    keySteps,
  };
  if (totalSkippedTriggers !== undefined) summary.totalSkippedTriggers = totalSkippedTriggers;
  if (totalAttemptedTriggers !== undefined) summary.totalAttemptedTriggers = totalAttemptedTriggers;
  if (totalCostAborts !== undefined) summary.totalCostAborts = totalCostAborts;
  if (totalPassSteps !== undefined) summary.totalPassSteps = totalPassSteps;
  if (totalActionSteps !== undefined) summary.totalActionSteps = totalActionSteps;
  if (terminationReason !== undefined) summary.terminationReason = terminationReason;
  return summary;
}

describe("core-metrics", () => {
  describe("computeCoreMetrics", () => {
    it("returns zeros for empty input", () => {
      const results = computeCoreMetrics([]);
      for (const result of results) {
        assert.equal(result.value, 0);
      }
    });

    it("includes seat_imbalance and omits skill_expression id", () => {
      const results = computeCoreMetrics([]);
      const ids = results.map((result) => result.id);
      assert.ok(ids.includes("seat_imbalance"));
      assert.ok(ids.includes("turn_taking_rate"));
      assert.equal(ids.includes("skill_expression"), false);
    });
  });

  describe("computeAgency and computeStrategicDepth", () => {
    it("uses legal action counts", () => {
      const summary = buildSummary({
        stepCount: 3,
        turnCount: 2,
        keySteps: [
          { turn: 1, phase: null, playerId: 1, actionId: "a", legalActionCount: 1 },
          { turn: 1, phase: null, playerId: 1, actionId: "b", legalActionCount: 2 },
          { turn: 2, phase: null, playerId: 2, actionId: "c", legalActionCount: 3 },
        ],
      });

      assert.ok(Math.abs(computeAgency([summary]) - 2 / 3) < 1e-9);
      assert.ok(Math.abs(computeStrategicDepth([summary]) - 2) < 1e-9);
    });
  });

  describe("computeVariety", () => {
    it("uses normalized trajectory entropy", () => {
      const summaryA = buildSummary({
        stepCount: 4,
        actionCounts: { a: 2, b: 2 },
      });
      const summaryB = buildSummary({
        stepCount: 3,
        actionCounts: { a: 3 },
      });

      assert.ok(Math.abs(computeVariety([summaryA, summaryB]) - 0.5) < 1e-9);
    });
  });

  describe("computeSkillExpression (seat imbalance)", () => {
    it("reflects win-rate gap", () => {
      const balanced = [
        buildSummary({ outcomes: { 1: "win", 2: "lose" } }),
        buildSummary({ outcomes: { 1: "lose", 2: "win" } }),
      ];
      const skewed = [
        buildSummary({ outcomes: { 1: "win", 2: "lose" } }),
        buildSummary({ outcomes: { 1: "win", 2: "lose" } }),
      ];

      assert.ok(Math.abs(computeSkillExpression(balanced)) < 1e-9);
      assert.ok(Math.abs(computeSkillExpression(skewed) - 1) < 1e-9);
    });

    it("handles draws and sparse player coverage", () => {
      const mixed = [
        buildSummary({ outcomes: { 1: "win", 2: "draw" } }),
        buildSummary({ outcomes: { 1: "draw", 2: "draw" } }),
      ];
      const singlePlayer = [
        buildSummary({ outcomes: { 1: "win" } }),
        buildSummary({ outcomes: { 1: "lose" } }),
      ];

      assert.ok(Math.abs(computeSkillExpression(mixed) - 0.25) < 1e-9);
      assert.ok(Math.abs(computeSkillExpression(singlePlayer)) < 1e-9);
    });
  });

  describe("computePacingTension", () => {
    it("uses steps per turn", () => {
      const summary = buildSummary({ stepCount: 6, turnCount: 3 });
      assert.ok(Math.abs(computePacingTension([summary]) - 2) < 1e-9);
    });
  });

  describe("computeTurnTakingRate", () => {
    it("tracks player turn transitions", () => {
      const alternating = buildSummary({
        keySteps: [
          { turn: 1, phase: null, playerId: 1 },
          { turn: 1, phase: null, playerId: 2 },
          { turn: 2, phase: null, playerId: 1 },
        ],
      });
      const singlePlayer = buildSummary({
        keySteps: [
          { turn: 1, phase: null, playerId: 1 },
          { turn: 1, phase: null, playerId: 1 },
          { turn: 2, phase: null, playerId: 1 },
        ],
      });

      assert.ok(Math.abs(computeTurnTakingRate([alternating]) - 1) < 1e-9);
      assert.ok(Math.abs(computeTurnTakingRate([singlePlayer])) < 1e-9);
    });
  });

  describe("computeInteractionRate", () => {
    it("counts cross-player effects on action steps", () => {
      const summary = buildSummary({
        keySteps: [
          {
            turn: 1,
            phase: null,
            playerId: 1,
            actionId: "a",
            affectedPlayerIds: [1],
          },
          {
            turn: 1,
            phase: null,
            playerId: 2,
            actionId: "b",
            affectedPlayerIds: [1, 2],
          },
          {
            turn: 2,
            phase: null,
            playerId: 1,
            actionId: "c",
            affectedPlayerIds: [],
          },
        ],
      });

      assert.ok(Math.abs(computeInteractionRate([summary]) - 1 / 3) < 1e-9);
    });

    it("ignores pass steps and missing affected players", () => {
      const summary = buildSummary({
        keySteps: [
          { turn: 1, phase: null, playerId: 1, actionId: null },
          { turn: 1, phase: null, playerId: 2, actionId: "b" },
          {
            turn: 2,
            phase: null,
            playerId: 1,
            actionId: "c",
            affectedPlayerIds: [2],
          },
        ],
      });

      assert.ok(Math.abs(computeInteractionRate([summary]) - 1 / 2) < 1e-9);
    });

    it("counts affectedGlobal: true steps as interactive", () => {
      const summary = buildSummary({
        keySteps: [
          {
            turn: 1,
            phase: null,
            playerId: 1,
            actionId: "a",
            affectedPlayerIds: [1],
            affectedGlobal: true,
          },
          {
            turn: 1,
            phase: null,
            playerId: 2,
            actionId: "b",
            affectedPlayerIds: [2],
            affectedGlobal: false,
          },
        ],
      });

      assert.ok(Math.abs(computeInteractionRate([summary]) - 1 / 2) < 1e-9);
    });

    it("counts step with both affectedGlobal and other-player only once", () => {
      const summary = buildSummary({
        keySteps: [
          {
            turn: 1,
            phase: null,
            playerId: 1,
            actionId: "a",
            affectedPlayerIds: [1, 2],
            affectedGlobal: true,
          },
        ],
      });

      assert.ok(Math.abs(computeInteractionRate([summary]) - 1) < 1e-9);
    });

    it("affectedGlobal: false with only self is NOT interactive", () => {
      const summary = buildSummary({
        keySteps: [
          {
            turn: 1,
            phase: null,
            playerId: 1,
            actionId: "a",
            affectedPlayerIds: [1],
            affectedGlobal: false,
          },
        ],
      });

      assert.ok(Math.abs(computeInteractionRate([summary])) < 1e-9);
    });
  });

  describe("computeSkippedTriggerRate", () => {
    it("computes correctly across summaries", () => {
      const summaries = [
        buildSummary({ totalSkippedTriggers: 3, totalAttemptedTriggers: 12 }),
        buildSummary({ totalSkippedTriggers: 2, totalAttemptedTriggers: 8 }),
      ];
      // 5 / 20 = 0.25
      assert.ok(Math.abs(computeSkippedTriggerRate(summaries) - 0.25) < 1e-9);
    });

    it("returns 0 when no triggers attempted", () => {
      const summaries = [
        buildSummary({ totalSkippedTriggers: 0, totalAttemptedTriggers: 0 }),
      ];
      assert.equal(computeSkippedTriggerRate(summaries), 0);
    });
  });

  describe("computeCostAbortRate", () => {
    it("computes correctly across summaries", () => {
      const summaries = [
        buildSummary({ totalCostAborts: 1, totalActionSteps: 15 }),
        buildSummary({ totalCostAborts: 2, totalActionSteps: 15 }),
      ];
      // 3 / 30 = 0.1
      assert.ok(Math.abs(computeCostAbortRate(summaries) - 0.1) < 1e-9);
    });
  });

  describe("computePassStepRate", () => {
    it("computes correctly across summaries", () => {
      const summaries = [
        buildSummary({ stepCount: 30, totalPassSteps: 5 }),
        buildSummary({ stepCount: 20, totalPassSteps: 5 }),
      ];
      // 10 / 50 = 0.2
      assert.ok(Math.abs(computePassStepRate(summaries) - 0.2) < 1e-9);
    });
  });

  describe("computeNoLegalActionsTerminationRate", () => {
    it("computes correctly across summaries", () => {
      const summaries = [
        buildSummary({ terminationReason: "no-legal-actions" }),
        buildSummary({ terminationReason: "max-turns" }),
        buildSummary({ terminationReason: "termination-condition" }),
        buildSummary({ terminationReason: "max-turns" }),
      ];
      // 1 / 4 = 0.25
      assert.ok(Math.abs(computeNoLegalActionsTerminationRate(summaries) - 0.25) < 1e-9);
    });
  });

  describe("new metrics in computeCoreMetrics output", () => {
    it("all four new metric IDs appear in output", () => {
      const summaries = [buildSummary()];
      const results = computeCoreMetrics(summaries);
      const ids = results.map((r) => r.id);
      assert.ok(ids.includes("skipped_trigger_rate"));
      assert.ok(ids.includes("cost_abort_rate"));
      assert.ok(ids.includes("pass_step_rate"));
      assert.ok(ids.includes("no_legal_actions_termination_rate"));
    });

    it("returns 11 metric entries total", () => {
      const results = computeCoreMetrics([buildSummary()]);
      assert.equal(results.length, 11);
    });

    it("new metrics are 0 when summaries lack the new fields (backward compat)", () => {
      const summaries = [
        {
          stepCount: 10,
          turnCount: 5,
          terminalOutcome: { outcomes: { 1: "draw", 2: "draw" } },
          terminated: true,
        },
      ];
      const results = computeCoreMetrics(summaries);
      const newIds = [
        "skipped_trigger_rate",
        "cost_abort_rate",
        "pass_step_rate",
        "no_legal_actions_termination_rate",
      ];
      for (const id of newIds) {
        const metric = results.find((r) => r.id === id);
        assert.equal(metric.value, 0, `${id} should be 0 for legacy summaries`);
      }
    });

    it("all four new metrics are in range [0, 1]", () => {
      const summaries = [
        buildSummary({
          stepCount: 50,
          totalSkippedTriggers: 5,
          totalAttemptedTriggers: 20,
          totalCostAborts: 3,
          totalActionSteps: 30,
          totalPassSteps: 10,
          terminationReason: "no-legal-actions",
        }),
      ];
      const results = computeCoreMetrics(summaries);
      const newIds = [
        "skipped_trigger_rate",
        "cost_abort_rate",
        "pass_step_rate",
        "no_legal_actions_termination_rate",
      ];
      for (const id of newIds) {
        const metric = results.find((r) => r.id === id);
        assert.ok(metric.value >= 0, `${id} should be >= 0`);
        assert.ok(metric.value <= 1, `${id} should be <= 1`);
      }
    });
  });
});
