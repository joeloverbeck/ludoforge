import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../../../src/simulation-engine/step-execution.js";

function makeDefinition({ min = 0, max = 10, initial = 5 } = {}) {
  return {
    state: {
      variables: [
        { id: "hp", scope: "global", type: { kind: "int", min, max }, initial },
      ],
    },
    turn: {},
  };
}

function makeState(value = 5) {
  return { variables: { global: { hp: value } }, tokens: {}, zones: {} };
}

describe("applyAction – bounds clamping on effects", () => {
  it("clamps inc effect that would exceed variable max", () => {
    const definition = makeDefinition({ min: 0, max: 10, initial: 5 });
    const state = makeState(8);
    const action = {
      id: "boost",
      effects: [{ kind: "inc", target: { kind: "var", id: "hp" }, amount: 5 }],
    };

    const result = applyAction(definition, state, action, { playerId: 1 });

    assert.ok(!result.costAborted);
    assert.equal(state.variables.global.hp, 10, "should clamp to max");
  });

  it("clamps dec effect that would go below variable min", () => {
    const definition = makeDefinition({ min: 0, max: 10, initial: 5 });
    const state = makeState(2);
    const action = {
      id: "drain",
      effects: [{ kind: "dec", target: { kind: "var", id: "hp" }, amount: 5 }],
    };

    const result = applyAction(definition, state, action, { playerId: 1 });

    assert.ok(!result.costAborted);
    assert.equal(state.variables.global.hp, 0, "should clamp to min");
  });

  it("clamps set effect with value above max", () => {
    const definition = makeDefinition({ min: 0, max: 10, initial: 5 });
    const state = makeState(5);
    const action = {
      id: "set-high",
      effects: [{ kind: "set", target: { kind: "var", id: "hp" }, value: 99 }],
    };

    const result = applyAction(definition, state, action, { playerId: 1 });

    assert.ok(!result.costAborted);
    assert.equal(state.variables.global.hp, 10, "should clamp to max");
  });

  it("clamps set effect with value below min", () => {
    const definition = makeDefinition({ min: 0, max: 10, initial: 5 });
    const state = makeState(5);
    const action = {
      id: "set-low",
      effects: [{ kind: "set", target: { kind: "var", id: "hp" }, value: -5 }],
    };

    const result = applyAction(definition, state, action, { playerId: 1 });

    assert.ok(!result.costAborted);
    assert.equal(state.variables.global.hp, 0, "should clamp to min");
  });

  it("costs still reject on underflow (regression)", () => {
    const definition = makeDefinition({ min: 0, max: 10, initial: 5 });
    const state = makeState(2);
    const action = {
      id: "expensive",
      costs: [{ kind: "dec", target: { kind: "var", id: "hp" }, amount: 5 }],
      effects: [{ kind: "inc", target: { kind: "var", id: "hp" }, amount: 1 }],
    };

    const result = applyAction(definition, state, action, { playerId: 1 });

    assert.equal(result.costAborted, true, "cost should still reject");
    assert.equal(state.variables.global.hp, 2, "state unchanged after cost rejection");
  });
});
