import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDegeneracy } from "../../../src/evaluation-analytics/degeneracy-detection.js";

function makeSummary(overrides = {}) {
  return {
    stepCount: 10,
    turnCount: 5,
    terminated: true,
    terminationReason: "condition",
    terminalOutcome: { outcomes: { 0: "win", 1: "lose" } },
    uniqueStateCount: 10,
    totalSkippedEffects: 0,
    totalAppliedEffects: 50,
    keySteps: [],
    actionCounts: { move: 10 },
    ...overrides,
  };
}

describe("degeneracy – high-skipped-effects flag", () => {
  it("fires when skip rate exceeds threshold with sufficient attempts", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 10, totalAppliedEffects: 40 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 50,
    });

    assert.ok(result.flags.includes("high-skipped-effects"));
    assert.ok(result.ratios["high-skipped-effects"] >= 0.10);
  });

  it("does not fire when skip rate is below threshold", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 2, totalAppliedEffects: 98 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 50,
    });

    assert.ok(!result.flags.includes("high-skipped-effects"));
  });

  it("does not fire when attempts below minimum", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 5, totalAppliedEffects: 5 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 100,
    });

    assert.ok(!result.flags.includes("high-skipped-effects"));
  });

  it("computes correct skip rate ratio", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 20, totalAppliedEffects: 80 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 50,
    });

    assert.ok(result.ratios["high-skipped-effects"] != null);
    assert.equal(result.ratios["high-skipped-effects"], 0.2);
  });

  it("accumulates across multiple summaries", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 5, totalAppliedEffects: 20 }),
      makeSummary({ totalSkippedEffects: 5, totalAppliedEffects: 20 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 50,
    });

    assert.ok(result.flags.includes("high-skipped-effects"));
    assert.equal(result.ratios["high-skipped-effects"], 0.2);
  });

  it("does not fire when no effects at all", () => {
    const summaries = [
      makeSummary({ totalSkippedEffects: 0, totalAppliedEffects: 0 }),
    ];

    const result = detectDegeneracy(summaries, {
      highSkippedEffectsRate: 0.10,
      highSkippedEffectsMinAttempts: 50,
    });

    assert.ok(!result.flags.includes("high-skipped-effects"));
  });
});
