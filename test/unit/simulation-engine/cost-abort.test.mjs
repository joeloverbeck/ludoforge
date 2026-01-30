import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../../../src/simulation-engine/step-execution.js";
import { buildVariableIndex } from "../../../src/game-kernel/ref-resolution.js";

describe("applyAction – cost abort", () => {
  const definition = {
    state: {
      variables: [
        { id: "gold", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
        { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
      ],
    },
  };

  function makeState() {
    return {
      variables: {
        global: { score: 5 },
        perPlayer: { 1: { gold: 0 }, 2: { gold: 0 } },
      },
      tokens: {},
      zones: {},
      agents: [{ id: 1 }, { id: 2 }],
      turn: { turn: 1, currentPlayer: 1 },
    };
  }

  it("aborts entirely when cost fails", () => {
    const state = makeState();
    const action = {
      id: "buy",
      costs: [
        { kind: "dec", target: { kind: "var", id: "gold" }, amount: 5 },
      ],
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 10 },
      ],
    };
    const context = { playerId: 1, definition };

    const result = applyAction(definition, state, action, context);

    assert.equal(result.costAborted, true);
    assert.equal(result.appliedEffects.length, 0);
    assert.equal(result.skippedEffects.length, 1);
    assert.equal(result.skippedEffects[0].source, "cost");
    assert.equal(state.variables.global.score, 5, "score should not be modified");
  });

  it("applies normally when costs succeed", () => {
    const state = makeState();
    state.variables.perPlayer[1].gold = 10;
    const action = {
      id: "buy",
      costs: [
        { kind: "dec", target: { kind: "var", id: "gold" }, amount: 5 },
      ],
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    };
    const context = { playerId: 1, definition };

    const result = applyAction(definition, state, action, context);

    assert.equal(result.costAborted, undefined);
    assert.ok(result.appliedEffects.length > 0);
    assert.equal(result.skippedEffects.length, 0);
  });
});
