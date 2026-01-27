import assert from "node:assert/strict";
import test from "node:test";

import {
  computeAgency,
  computeCoreMetrics,
  computeInteractionRate,
  computePacingTension,
  computeSkillExpression,
  computeStrategicDepth,
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
    terminalOutcome: { terminated: true, reason: "condition", outcomes },
    actionCounts,
    keySteps,
  };
}

test("core metrics return zeros for empty input", () => {
  const results = computeCoreMetrics([]);
  for (const result of results) {
    assert.equal(result.value, 0);
  }
});

test("agency and strategic depth use legal action counts", () => {
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

test("variety uses normalized trajectory entropy", () => {
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

test("skill expression reflects win-rate gap", () => {
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

test("skill expression handles draws and sparse player coverage", () => {
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

test("pacing tension uses steps per turn", () => {
  const summary = buildSummary({ stepCount: 6, turnCount: 3 });
  assert.ok(Math.abs(computePacingTension([summary]) - 2) < 1e-9);
});

test("interaction rate tracks player turn transitions", () => {
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

  assert.ok(Math.abs(computeInteractionRate([alternating]) - 1) < 1e-9);
  assert.ok(Math.abs(computeInteractionRate([singlePlayer])) < 1e-9);
});
