import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDegeneracyFilters,
  detectDegeneracy,
} from "../../../src/evaluation-analytics/degeneracy.js";

test("detectDegeneracy flags loops when repeated states or loop detection occurs", () => {
  const summaries = [
    {
      stepCount: 6,
      turnCount: 6,
      terminalOutcome: { terminated: true },
      terminationReason: "loop-detected",
      uniqueStateCount: 3,
      keySteps: [],
    },
  ];

  const report = detectDegeneracy(summaries);
  assert.ok(report.flags.includes("loop"));
  assert.ok(report.details?.loop?.includes("loop_detected=1"));
});

test("detectDegeneracy only flags stalemate when outcome is draw-for-all", () => {
  const summaries = [
    {
      stepCount: 4,
      turnCount: 4,
      terminationReason: "stalemate",
      terminalOutcome: { terminated: true, outcomes: { 1: "win", 2: "lose" } },
    },
  ];

  const report = detectDegeneracy(summaries);
  assert.equal(report.flags.includes("stalemate"), false);
});

test("detectDegeneracy treats no-legal-actions draw as stalemate", () => {
  const summaries = [
    {
      stepCount: 2,
      turnCount: 2,
      terminationReason: "no-legal-actions",
      terminalOutcome: { terminated: true, outcomes: { 1: "draw", 2: "draw" } },
    },
  ];

  const report = detectDegeneracy(summaries);
  assert.ok(report.flags.includes("stalemate"));
  assert.ok(report.details?.stalemate?.includes("count=1"));
});

test("detectDegeneracy flags forced-move dominance and no-choices", () => {
  const summaries = [
    {
      stepCount: 3,
      turnCount: 3,
      terminalOutcome: { terminated: true },
      keySteps: [
        { turn: 1, phase: null, playerId: 1, legalActionCount: 1 },
        { turn: 2, phase: null, playerId: 2, legalActionCount: 1 },
        { turn: 3, phase: null, playerId: 1, legalActionCount: 1 },
      ],
    },
  ];

  const report = detectDegeneracy(summaries);
  assert.ok(report.flags.includes("forced-move"));
  assert.ok(report.flags.includes("no-choices"));
  assert.ok(report.details?.["forced-move"]?.includes("forced_steps=3"));
});

test("detectDegeneracy flags dominant-action for overwhelming action share", () => {
  const summaries = [
    {
      stepCount: 12,
      turnCount: 12,
      terminalOutcome: { terminated: true },
      actionCounts: { pass: 10, take: 2 },
    },
  ];

  const report = detectDegeneracy(summaries);
  assert.ok(report.flags.includes("dominant-action"));
  assert.ok(report.details?.["dominant-action"]?.includes("action=pass"));
});

test("detectDegeneracy flags trivial-win for quick, consistent winners", () => {
  const outcome = { terminated: true, outcomes: { 1: "win", 2: "lose" } };
  const summaries = [
    { stepCount: 2, turnCount: 2, terminalOutcome: outcome },
    { stepCount: 2, turnCount: 2, terminalOutcome: outcome },
    { stepCount: 2, turnCount: 2, terminalOutcome: outcome },
  ];

  const report = detectDegeneracy(summaries);
  assert.ok(report.flags.includes("trivial-win"));
  assert.ok(report.details?.["trivial-win"]?.includes("winner=1"));
});

test("applyDegeneracyFilters rejects reports with default reject flags", () => {
  const decision = applyDegeneracyFilters({
    flags: ["loop", "forced-move"],
    details: {},
  });

  assert.equal(decision.allow, false);
  assert.deepEqual(decision.rejectedFlags.sort(), ["forced-move", "loop"]);
});
