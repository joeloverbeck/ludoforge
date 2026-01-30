import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeAgency,
  computeCoreMetrics,
  computeInteractionRate,
  computePacingTension,
  computeSkillExpression,
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
} = {}) {
  return {
    stepCount,
    turnCount,
    terminalOutcome: { outcomes },
    terminated: true,
    actionCounts,
    keySteps,
  };
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
});
