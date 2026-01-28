import assert from "node:assert/strict";
import test from "node:test";

import {
  computeCoverageActions,
  computeCoverageState,
  computeEarlyTerminationRate,
  computeExtendedMetrics,
  computeLengthMean,
  computeLengthVariance,
  computeOutcomeVariance,
} from "../../../src/evaluation-analytics/metrics/extended.js";

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

test("length metrics compute mean, variance, and early termination rate", () => {
  const summaries = [
    buildSummary({ stepCount: 2 }),
    buildSummary({ stepCount: 4, terminationReason: "max-turns" }),
    buildSummary({ stepCount: 6, terminationReason: "stalemate" }),
  ];

  assert.ok(Math.abs(computeLengthMean(summaries) - 4) < 1e-9);
  assert.ok(Math.abs(computeLengthVariance(summaries) - 8 / 3) < 1e-9);
  assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 2 / 3) < 1e-9);
});

test("early termination rate treats un-terminated outcomes as early exits", () => {
  const summaries = [
    buildSummary({ stepCount: 3, terminated: false }),
    buildSummary({ stepCount: 3 }),
  ];

  assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 0.5) < 1e-9);
});

test("early termination rate excludes condition-based terminations", () => {
  const summaries = [
    buildSummary({ terminationReason: "condition" }),
    buildSummary({ terminationReason: "max-steps" }),
    buildSummary({ terminated: false }),
  ];

  assert.ok(Math.abs(computeEarlyTerminationRate(summaries) - 2 / 3) < 1e-9);
});

test("outcome variance measures swinginess across runs", () => {
  const summaries = [
    buildSummary({ outcomes: { 1: "win", 2: "lose" } }),
    buildSummary({ outcomes: { 1: "lose", 2: "win" } }),
  ];

  assert.ok(Math.abs(computeOutcomeVariance(summaries) - 0.25) < 1e-9);
});

test("coverage metrics use definition actions and state exploration proxies", () => {
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

test("extended metrics bundle output", () => {
  const definition = {
    version: "0.1.0",
    players: { count: 2 },
    state: { variables: [] },
    actions: [{ id: "a" }],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [] },
  };

  const summaries = [buildSummary({ stepCount: 2, actionCounts: { a: 2 } })];
  const metrics = computeExtendedMetrics(definition, summaries);

  assert.equal(getMetric(metrics, "length_mean"), 2);
  assert.equal(getMetric(metrics, "length_variance"), 0);
  assert.equal(getMetric(metrics, "early_termination_rate"), 0);
  assert.equal(getMetric(metrics, "outcome_variance"), 0);
  assert.equal(getMetric(metrics, "coverage_actions"), 1);
  assert.equal(getMetric(metrics, "coverage_state"), 0);
});
