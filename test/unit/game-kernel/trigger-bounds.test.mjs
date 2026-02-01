import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyTriggers } from "../../../src/game-kernel/triggers.js";

function makeDefinition({ min = 0, max = 10, initial = 5 } = {}) {
  return {
    state: {
      variables: [
        { id: "hp", scope: "global", type: { kind: "int", min, max }, initial },
      ],
    },
    turn: {},
    triggers: [],
  };
}

function makeState(value = 5) {
  return { variables: { global: { hp: value } }, tokens: {}, zones: {}, turn: { turn: 1 } };
}

describe("applyTriggers – bounds clamping", () => {
  it("clamps trigger inc effect that would overflow", () => {
    const definition = makeDefinition({ min: 0, max: 10 });
    definition.triggers = [
      {
        event: "after_action",
        effects: [{ kind: "inc", target: { kind: "var", id: "hp" }, amount: 20 }],
      },
    ];
    const state = makeState(8);

    const result = applyTriggers(definition, state, "after_action", { playerId: 1 });

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.hp, 10, "should clamp to max");
  });

  it("clamps trigger set effect above max", () => {
    const definition = makeDefinition({ min: 0, max: 10 });
    definition.triggers = [
      {
        event: "after_action",
        effects: [{ kind: "set", target: { kind: "var", id: "hp" }, value: 50 }],
      },
    ];
    const state = makeState(5);

    const result = applyTriggers(definition, state, "after_action", { playerId: 1 });

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.hp, 10, "should clamp to max");
  });

  it("cumulative trigger firings remain clamped", () => {
    const definition = makeDefinition({ min: 0, max: 10 });
    definition.triggers = [
      {
        event: "after_action",
        effects: [
          { kind: "inc", target: { kind: "var", id: "hp" }, amount: 4 },
          { kind: "inc", target: { kind: "var", id: "hp" }, amount: 4 },
        ],
      },
    ];
    const state = makeState(8);

    const result = applyTriggers(definition, state, "after_action", { playerId: 1 });

    assert.equal(result.ok, true);
    assert.ok(state.variables.global.hp <= 10, "should not exceed max");
  });
});
