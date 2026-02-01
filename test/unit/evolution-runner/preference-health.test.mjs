import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildPreferenceHealth } from "../../../src/evolution-runner/preference-health.js";

function baseInput(overrides = {}) {
  return {
    meanUncertainty: 0.12,
    oodRate: 0.05,
    controllerMode: "learning",
    stableGenCount: 3,
    plannedBudget: 2,
    didPrompt: true,
    metricIdDeltaDetected: false,
    ...overrides,
  };
}

describe("buildPreferenceHealth", () => {
  it("returns all fields from spec §1.5", () => {
    const health = buildPreferenceHealth(baseInput());
    const requiredKeys = [
      "meanUncertainty",
      "oodRate",
      "controllerMode",
      "stableGenCount",
      "plannedBudget",
      "didPrompt",
      "metricIdDeltaDetected",
    ];
    for (const key of requiredKeys) {
      assert.ok(key in health, `missing field: ${key}`);
    }
    assert.strictEqual(Object.keys(health).length, requiredKeys.length);
  });

  it("preserves numeric values", () => {
    const health = buildPreferenceHealth(baseInput());
    assert.strictEqual(health.meanUncertainty, 0.12);
    assert.strictEqual(health.oodRate, 0.05);
    assert.strictEqual(health.stableGenCount, 3);
    assert.strictEqual(health.plannedBudget, 2);
  });

  it("preserves boolean values", () => {
    const health = buildPreferenceHealth(baseInput());
    assert.strictEqual(health.didPrompt, true);
    assert.strictEqual(health.metricIdDeltaDetected, false);
  });

  it("preserves controllerMode", () => {
    const learning = buildPreferenceHealth(baseInput({ controllerMode: "learning" }));
    assert.strictEqual(learning.controllerMode, "learning");

    const frozen = buildPreferenceHealth(baseInput({ controllerMode: "frozen" }));
    assert.strictEqual(frozen.controllerMode, "frozen");
  });

  it("sanitizes non-finite numbers to 0", () => {
    const health = buildPreferenceHealth(baseInput({
      meanUncertainty: NaN,
      oodRate: Infinity,
      stableGenCount: -Infinity,
      plannedBudget: undefined,
    }));
    assert.strictEqual(health.meanUncertainty, 0);
    assert.strictEqual(health.oodRate, 0);
    assert.strictEqual(health.stableGenCount, 0);
    assert.strictEqual(health.plannedBudget, 0);
  });

  it("coerces non-boolean didPrompt to boolean", () => {
    const health = buildPreferenceHealth(baseInput({ didPrompt: 0 }));
    assert.strictEqual(health.didPrompt, false);

    const health2 = buildPreferenceHealth(baseInput({ didPrompt: 1 }));
    assert.strictEqual(health2.didPrompt, true);
  });

  it("coerces non-boolean metricIdDeltaDetected to boolean", () => {
    const health = buildPreferenceHealth(baseInput({ metricIdDeltaDetected: null }));
    assert.strictEqual(health.metricIdDeltaDetected, false);
  });

  it("defaults unknown controllerMode to 'learning'", () => {
    const health = buildPreferenceHealth(baseInput({ controllerMode: "bogus" }));
    assert.strictEqual(health.controllerMode, "learning");
  });

  it("is a pure function — identical inputs produce identical outputs", () => {
    const input = baseInput();
    const r1 = buildPreferenceHealth(input);
    const r2 = buildPreferenceHealth(input);
    assert.deepStrictEqual(r1, r2);
  });

  it("does not mutate input", () => {
    const input = baseInput();
    const inputCopy = structuredClone(input);
    buildPreferenceHealth(input);
    assert.deepStrictEqual(input, inputCopy);
  });

  it("returns JSON-serializable output", () => {
    const health = buildPreferenceHealth(baseInput());
    const roundTripped = JSON.parse(JSON.stringify(health));
    assert.deepStrictEqual(roundTripped, health);
  });

  it("handles zero-feedback frozen scenario", () => {
    const health = buildPreferenceHealth(baseInput({
      controllerMode: "frozen",
      plannedBudget: 0,
      didPrompt: false,
      oodRate: 0,
    }));
    assert.strictEqual(health.controllerMode, "frozen");
    assert.strictEqual(health.plannedBudget, 0);
    assert.strictEqual(health.didPrompt, false);
  });
});
