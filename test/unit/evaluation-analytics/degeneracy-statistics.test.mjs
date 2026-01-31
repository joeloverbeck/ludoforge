import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { accumulateStatistics } from "../../../src/evaluation-analytics/degeneracy-statistics.js";

describe("accumulateStatistics", () => {
  it("returns zeroed stats for empty summaries", () => {
    const stats = accumulateStatistics([]);
    assert.equal(stats.loopDetectedCount, 0);
    assert.equal(stats.stalemateCount, 0);
    assert.equal(stats.nonTerminatingCount, 0);
    assert.equal(stats.maxTurnsCount, 0);
    assert.equal(stats.maxStepsCount, 0);
    assert.equal(stats.forcedSamples, 0);
    assert.equal(stats.forcedSteps, 0);
    assert.equal(stats.totalActions, 0);
    assert.equal(stats.actionTotals.size, 0);
    assert.equal(stats.skippedEffectsTotal, 0);
    assert.equal(stats.appliedEffectsTotal, 0);
    assert.equal(stats.winSamples, 0);
    assert.equal(stats.winStepTotal, 0);
    assert.equal(stats.winStepSamples, 0);
    assert.equal(stats.winCounts.size, 0);
  });

  it("counts loop-detected terminations", () => {
    const summaries = [
      { terminationReason: "loop-detected", terminated: false },
      { terminationReason: "loop-detected", terminated: false },
      { terminationReason: "natural", terminated: true },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.loopDetectedCount, 2);
  });

  it("counts stalemate only when draw-for-all", () => {
    const summaries = [
      {
        terminationReason: "stalemate",
        terminated: true,
        terminalOutcome: { outcomes: { 1: "draw", 2: "draw" } },
      },
      {
        terminationReason: "stalemate",
        terminated: true,
        terminalOutcome: { outcomes: { 1: "win", 2: "lose" } },
      },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.stalemateCount, 1);
  });

  it("counts no-legal-actions as stalemate when draw-for-all", () => {
    const summaries = [
      {
        terminationReason: "no-legal-actions",
        terminated: true,
        terminalOutcome: { outcomes: { 1: "draw", 2: "draw" } },
      },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.stalemateCount, 1);
  });

  it("counts non-terminating for max-turns, max-steps, loop-detected, and unterminated", () => {
    const summaries = [
      { terminationReason: "max-turns", terminated: true },
      { terminationReason: "max-steps", terminated: true },
      { terminationReason: "loop-detected", terminated: false },
      { terminated: false },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.nonTerminatingCount, 4);
    assert.equal(stats.maxTurnsCount, 1);
    assert.equal(stats.maxStepsCount, 1);
  });

  it("tracks max repeat ratio from uniqueStateCount and stepCount", () => {
    const summaries = [
      { stepCount: 10, uniqueStateCount: 4 },
      { stepCount: 8, uniqueStateCount: 7 },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.loopRepeatSamples, 2);
    assert.equal(stats.maxRepeatRatio, 0.6);
    assert.equal(stats.maxRepeatedStates, 6);
    assert.equal(stats.maxLoopSteps, 10);
  });

  it("skips repeat ratio when uniqueStateCount is missing", () => {
    const summaries = [{ stepCount: 10 }];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.loopRepeatSamples, 0);
    assert.equal(stats.maxRepeatRatio, 0);
  });

  it("skips repeat ratio when stepCount is zero or missing", () => {
    const summaries = [{ stepCount: 0, uniqueStateCount: 0 }];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.loopRepeatSamples, 0);
  });

  it("accumulates forced move samples and forced steps from keySteps", () => {
    const summaries = [
      {
        keySteps: [
          { legalActionCount: 1 },
          { legalActionCount: 3 },
          { legalActionCount: 1 },
        ],
      },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.forcedSamples, 3);
    assert.equal(stats.forcedSteps, 2);
  });

  it("handles missing keySteps gracefully", () => {
    const summaries = [{ terminated: true }];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.forcedSamples, 0);
    assert.equal(stats.forcedSteps, 0);
  });

  it("accumulates action counts across summaries", () => {
    const summaries = [
      { actionCounts: { move: 3, pass: 2 } },
      { actionCounts: { move: 1, attack: 5 } },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.actionTotals.get("move"), 4);
    assert.equal(stats.actionTotals.get("pass"), 2);
    assert.equal(stats.actionTotals.get("attack"), 5);
    assert.equal(stats.totalActions, 11);
  });

  it("ignores non-numeric action counts", () => {
    const summaries = [{ actionCounts: { move: "bad", pass: 2 } }];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.actionTotals.get("move"), undefined);
    assert.equal(stats.actionTotals.get("pass"), 2);
    assert.equal(stats.totalActions, 2);
  });

  it("accumulates skipped and applied effects totals", () => {
    const summaries = [
      { totalSkippedEffects: 3, totalAppliedEffects: 7 },
      { totalSkippedEffects: 2, totalAppliedEffects: 8 },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.skippedEffectsTotal, 5);
    assert.equal(stats.appliedEffectsTotal, 15);
  });

  it("accumulates win counts for single-winner outcomes", () => {
    const summaries = [
      { terminalOutcome: { outcomes: { 1: "win", 2: "lose" } }, stepCount: 4 },
      { terminalOutcome: { outcomes: { 1: "win", 2: "lose" } }, stepCount: 6 },
      { terminalOutcome: { outcomes: { 2: "win", 1: "lose" } }, stepCount: 3 },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.winCounts.get("1"), 2);
    assert.equal(stats.winCounts.get("2"), 1);
    assert.equal(stats.winSamples, 3);
    assert.equal(stats.winStepTotal, 13);
    assert.equal(stats.winStepSamples, 3);
  });

  it("ignores multi-winner outcomes", () => {
    const summaries = [
      { terminalOutcome: { outcomes: { 1: "win", 2: "win" } }, stepCount: 4 },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.winSamples, 0);
  });

  it("ignores draw outcomes for win counting", () => {
    const summaries = [
      { terminalOutcome: { outcomes: { 1: "draw", 2: "draw" } }, stepCount: 4 },
    ];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.winSamples, 0);
  });

  it("handles null and undefined summaries gracefully", () => {
    const summaries = [null, undefined, {}];
    const stats = accumulateStatistics(summaries);
    assert.equal(stats.loopDetectedCount, 0);
    assert.equal(stats.forcedSamples, 0);
  });
});
