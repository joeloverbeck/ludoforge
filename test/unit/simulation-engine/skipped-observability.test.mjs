import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStep } from "../../../src/simulation-engine/step-execution.js";

describe("buildStep – skipped data propagation", () => {
  function makeState() {
    return {
      turn: { turn: 1, phase: "main", currentPlayer: 1 },
      variables: {},
      tokens: [],
      zones: [],
    };
  }

  it("includes skippedEffects when non-empty", () => {
    const skippedEffects = [
      { effect: { kind: "dec", target: { kind: "var", id: "gold" } }, reason: "bounds", source: "effect" },
    ];
    const step = buildStep(makeState(), "attack", 3, undefined, {
      stateHash: "abc",
      bindings: {},
      appliedEffects: [],
      skippedEffects,
      skippedTriggers: [],
    });

    assert.ok(Array.isArray(step.skippedEffects));
    assert.equal(step.skippedEffects.length, 1);
    assert.equal(step.skippedEffects[0].reason, "bounds");
  });

  it("includes skippedTriggers when non-empty", () => {
    const skippedTriggers = [{ reason: "trigger-loop" }];
    const step = buildStep(makeState(), "attack", 3, undefined, {
      stateHash: "abc",
      bindings: {},
      appliedEffects: [],
      skippedEffects: [],
      skippedTriggers,
    });

    assert.ok(Array.isArray(step.skippedTriggers));
    assert.equal(step.skippedTriggers.length, 1);
    assert.equal(step.skippedTriggers[0].reason, "trigger-loop");
  });

  it("omits skippedEffects when empty", () => {
    const step = buildStep(makeState(), "attack", 3, undefined, {
      stateHash: "abc",
      bindings: {},
      appliedEffects: [],
      skippedEffects: [],
      skippedTriggers: [],
    });

    assert.equal(step.skippedEffects, undefined);
    assert.equal(step.skippedTriggers, undefined);
  });

  it("omits skipped fields when trace has no skipped data", () => {
    const step = buildStep(makeState(), "attack", 3, undefined, {
      stateHash: "abc",
      bindings: {},
      appliedEffects: [],
    });

    assert.equal(step.skippedEffects, undefined);
    assert.equal(step.skippedTriggers, undefined);
  });
});
