import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MAX_TRIGGER_DEPTH,
  DEFAULT_MAX_STEPS_PER_TURN,
  DEFAULT_STATE_HISTORY_LIMIT,
  resolveMaxTurns,
  resolveMaxStepsPerTurn,
  resolveMaxTriggerDepth,
  resolveStateHistoryLimit,
} from "../../../src/game-kernel/scheduler-config.js";

describe("scheduler-config constants", () => {
  it("exports expected defaults", () => {
    assert.strictEqual(DEFAULT_MAX_TRIGGER_DEPTH, 8);
    assert.strictEqual(DEFAULT_MAX_STEPS_PER_TURN, 1000);
    assert.strictEqual(DEFAULT_STATE_HISTORY_LIMIT, 256);
  });
});

describe("resolveMaxTurns", () => {
  it("returns options.maxTurns when provided", () => {
    assert.strictEqual(resolveMaxTurns({ termination: { maxTurns: 50 } }, { maxTurns: 10 }), 10);
  });

  it("falls back to definition.termination.maxTurns", () => {
    assert.strictEqual(resolveMaxTurns({ termination: { maxTurns: 50 } }, {}), 50);
  });

  it("returns undefined when neither source provides maxTurns", () => {
    assert.strictEqual(resolveMaxTurns({ termination: {} }, {}), undefined);
    assert.strictEqual(resolveMaxTurns({}, {}), undefined);
  });
});

describe("resolveMaxStepsPerTurn", () => {
  it("returns options value when provided", () => {
    assert.strictEqual(resolveMaxStepsPerTurn({ maxStepsPerTurn: 500 }), 500);
  });

  it("returns default when not provided", () => {
    assert.strictEqual(resolveMaxStepsPerTurn({}), DEFAULT_MAX_STEPS_PER_TURN);
  });
});

describe("resolveMaxTriggerDepth", () => {
  it("returns options value when provided", () => {
    assert.strictEqual(resolveMaxTriggerDepth({ maxTriggerDepth: 4 }), 4);
  });

  it("returns default when not provided", () => {
    assert.strictEqual(resolveMaxTriggerDepth({}), DEFAULT_MAX_TRIGGER_DEPTH);
  });
});

describe("resolveStateHistoryLimit", () => {
  it("returns options value when provided", () => {
    assert.strictEqual(resolveStateHistoryLimit({ stateHistoryLimit: 128 }), 128);
  });

  it("returns default when not provided", () => {
    assert.strictEqual(resolveStateHistoryLimit({}), DEFAULT_STATE_HISTORY_LIMIT);
  });
});
