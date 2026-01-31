import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkFlags } from "../../../src/evaluation-analytics/degeneracy-flags.js";

function makeBaseStats(overrides = {}) {
  return {
    loopDetectedCount: 0,
    loopRepeatSamples: 0,
    maxRepeatRatio: 0,
    maxRepeatedStates: 0,
    maxLoopSteps: 0,
    stalemateCount: 0,
    nonTerminatingCount: 0,
    maxTurnsCount: 0,
    maxStepsCount: 0,
    forcedSamples: 0,
    forcedSteps: 0,
    actionTotals: new Map(),
    totalActions: 0,
    skippedEffectsTotal: 0,
    appliedEffectsTotal: 0,
    winCounts: new Map(),
    winSamples: 0,
    winStepTotal: 0,
    winStepSamples: 0,
    ...overrides,
  };
}

function makeBaseThresholds(overrides = {}) {
  return {
    loopRepeatRatio: 0.25,
    minRepeatedStates: 1,
    forcedMoveRatio: 0.8,
    dominantActionRatio: 0.8,
    minActionSamples: 10,
    trivialWinRate: 0.9,
    trivialWinMaxAverageSteps: 3,
    minTrivialWinSamples: 3,
    minStepsForNoChoices: 10,
    highSkippedEffectsRate: 0.1,
    highSkippedEffectsMinAttempts: 50,
    ...overrides,
  };
}

describe("checkFlags", () => {
  it("returns empty flags for clean stats", () => {
    const result = checkFlags(makeBaseStats(), makeBaseThresholds(), 5);
    assert.equal(result.flags.size, 0);
    assert.deepEqual(result.details, {});
    assert.deepEqual(result.ratios, {});
  });

  describe("loop flag", () => {
    it("fires when loopDetectedCount > 0", () => {
      const stats = makeBaseStats({ loopDetectedCount: 1 });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.ok(result.flags.has("loop"));
      assert.ok(result.details.loop.includes("loop_detected=1"));
    });

    it("fires when repeat ratio meets threshold", () => {
      const stats = makeBaseStats({
        maxRepeatRatio: 0.3,
        maxRepeatedStates: 2,
        loopRepeatSamples: 1,
        maxLoopSteps: 10,
      });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.ok(result.flags.has("loop"));
    });

    it("does not fire when repeat ratio below threshold", () => {
      const stats = makeBaseStats({
        maxRepeatRatio: 0.2,
        maxRepeatedStates: 1,
      });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.equal(result.flags.has("loop"), false);
    });
  });

  describe("stalemate flag", () => {
    it("fires when stalemateCount > 0", () => {
      const stats = makeBaseStats({ stalemateCount: 2 });
      const result = checkFlags(stats, makeBaseThresholds(), 10);
      assert.ok(result.flags.has("stalemate"));
      assert.ok(result.details.stalemate.includes("count=2"));
      assert.ok(result.details.stalemate.includes("samples=10"));
    });

    it("does not fire when stalemateCount is 0", () => {
      const stats = makeBaseStats({ stalemateCount: 0 });
      const result = checkFlags(stats, makeBaseThresholds(), 10);
      assert.equal(result.flags.has("stalemate"), false);
    });
  });

  describe("non-terminating flag", () => {
    it("fires when nonTerminatingCount > 0", () => {
      const stats = makeBaseStats({
        nonTerminatingCount: 3,
        maxTurnsCount: 1,
        maxStepsCount: 2,
        loopDetectedCount: 0,
      });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.ok(result.flags.has("non-terminating"));
      assert.ok(result.details["non-terminating"].includes("count=3"));
    });
  });

  describe("forced-move flag", () => {
    it("fires when forced ratio meets threshold", () => {
      const stats = makeBaseStats({ forcedSamples: 10, forcedSteps: 9 });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.ok(result.flags.has("forced-move"));
      assert.equal(result.ratios["forced-move"], 0.9);
    });

    it("does not fire when forced ratio below threshold", () => {
      const stats = makeBaseStats({ forcedSamples: 10, forcedSteps: 5 });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.equal(result.flags.has("forced-move"), false);
      assert.equal(result.ratios["forced-move"], 0.5);
    });

    it("populates ratio even when flag not triggered", () => {
      const stats = makeBaseStats({ forcedSamples: 10, forcedSteps: 2 });
      const result = checkFlags(stats, makeBaseThresholds(), 5);
      assert.equal(result.ratios["forced-move"], 0.2);
    });
  });

  describe("no-choices flag", () => {
    it("fires when all steps forced and count meets threshold", () => {
      const stats = makeBaseStats({ forcedSamples: 10, forcedSteps: 10 });
      const result = checkFlags(stats, makeBaseThresholds({ minStepsForNoChoices: 10 }), 5);
      assert.ok(result.flags.has("no-choices"));
    });

    it("does not fire when forcedSteps < forcedSamples", () => {
      const stats = makeBaseStats({ forcedSamples: 10, forcedSteps: 9 });
      const result = checkFlags(stats, makeBaseThresholds({ minStepsForNoChoices: 5 }), 5);
      assert.equal(result.flags.has("no-choices"), false);
    });

    it("does not fire when count below threshold", () => {
      const stats = makeBaseStats({ forcedSamples: 5, forcedSteps: 5 });
      const result = checkFlags(stats, makeBaseThresholds({ minStepsForNoChoices: 10 }), 5);
      assert.equal(result.flags.has("no-choices"), false);
    });
  });

  describe("dominant-action flag", () => {
    it("fires when top action ratio meets threshold", () => {
      const actionTotals = new Map([["pass", 9], ["move", 1]]);
      const stats = makeBaseStats({ actionTotals, totalActions: 10 });
      const result = checkFlags(stats, makeBaseThresholds({ minActionSamples: 10 }), 5);
      assert.ok(result.flags.has("dominant-action"));
      assert.ok(result.details["dominant-action"].includes("action=pass"));
    });

    it("does not fire when below minActionSamples", () => {
      const actionTotals = new Map([["pass", 8], ["move", 1]]);
      const stats = makeBaseStats({ actionTotals, totalActions: 9 });
      const result = checkFlags(stats, makeBaseThresholds({ minActionSamples: 10 }), 5);
      assert.equal(result.flags.has("dominant-action"), false);
    });

    it("does not fire when ratio below threshold", () => {
      const actionTotals = new Map([["pass", 5], ["move", 5]]);
      const stats = makeBaseStats({ actionTotals, totalActions: 10 });
      const result = checkFlags(stats, makeBaseThresholds({ minActionSamples: 10 }), 5);
      assert.equal(result.flags.has("dominant-action"), false);
    });
  });

  describe("trivial-win flag", () => {
    it("fires when win rate and avg steps meet thresholds", () => {
      const winCounts = new Map([["1", 5]]);
      const stats = makeBaseStats({
        winCounts,
        winSamples: 5,
        winStepTotal: 10,
        winStepSamples: 5,
      });
      const thresholds = makeBaseThresholds({ minTrivialWinSamples: 3 });
      const result = checkFlags(stats, thresholds, 5);
      assert.ok(result.flags.has("trivial-win"));
      assert.ok(result.details["trivial-win"].includes("winner=1"));
    });

    it("does not fire when avg steps above threshold", () => {
      const winCounts = new Map([["1", 5]]);
      const stats = makeBaseStats({
        winCounts,
        winSamples: 5,
        winStepTotal: 20,
        winStepSamples: 5,
      });
      const thresholds = makeBaseThresholds({ minTrivialWinSamples: 3 });
      const result = checkFlags(stats, thresholds, 5);
      assert.equal(result.flags.has("trivial-win"), false);
    });

    it("does not fire when below minTrivialWinSamples", () => {
      const winCounts = new Map([["1", 2]]);
      const stats = makeBaseStats({
        winCounts,
        winSamples: 2,
        winStepTotal: 4,
        winStepSamples: 2,
      });
      const thresholds = makeBaseThresholds({ minTrivialWinSamples: 3 });
      const result = checkFlags(stats, thresholds, 5);
      assert.equal(result.flags.has("trivial-win"), false);
    });
  });

  describe("high-skipped-effects flag", () => {
    it("fires when skip rate meets threshold", () => {
      const stats = makeBaseStats({
        skippedEffectsTotal: 10,
        appliedEffectsTotal: 40,
      });
      const thresholds = makeBaseThresholds({ highSkippedEffectsMinAttempts: 50 });
      const result = checkFlags(stats, thresholds, 5);
      assert.ok(result.flags.has("high-skipped-effects"));
      assert.equal(result.ratios["high-skipped-effects"], 0.2);
    });

    it("does not fire when below minAttempts", () => {
      const stats = makeBaseStats({
        skippedEffectsTotal: 5,
        appliedEffectsTotal: 5,
      });
      const thresholds = makeBaseThresholds({ highSkippedEffectsMinAttempts: 50 });
      const result = checkFlags(stats, thresholds, 5);
      assert.equal(result.flags.has("high-skipped-effects"), false);
    });

    it("does not fire when skip rate below threshold", () => {
      const stats = makeBaseStats({
        skippedEffectsTotal: 1,
        appliedEffectsTotal: 99,
      });
      const thresholds = makeBaseThresholds({ highSkippedEffectsMinAttempts: 50 });
      const result = checkFlags(stats, thresholds, 5);
      assert.equal(result.flags.has("high-skipped-effects"), false);
    });
  });

  describe("combined flags", () => {
    it("can set multiple flags simultaneously", () => {
      const actionTotals = new Map([["pass", 10]]);
      const stats = makeBaseStats({
        loopDetectedCount: 1,
        stalemateCount: 1,
        nonTerminatingCount: 1,
        forcedSamples: 10,
        forcedSteps: 10,
        actionTotals,
        totalActions: 10,
      });
      const thresholds = makeBaseThresholds({ minStepsForNoChoices: 10, minActionSamples: 10 });
      const result = checkFlags(stats, thresholds, 5);
      assert.ok(result.flags.has("loop"));
      assert.ok(result.flags.has("stalemate"));
      assert.ok(result.flags.has("non-terminating"));
      assert.ok(result.flags.has("forced-move"));
      assert.ok(result.flags.has("no-choices"));
      assert.ok(result.flags.has("dominant-action"));
    });
  });
});
