import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cloneState, applyAction, applyAfterActionTriggers, createStepImpact, buildStep } from "../../../src/simulation-engine/step-execution.js";

describe("cloneState", () => {
  it("produces a deep copy", () => {
    const original = { a: { b: 1 }, c: [2, 3] };
    const clone = cloneState(original);
    assert.deepEqual(clone, original);
    clone.a.b = 99;
    assert.equal(original.a.b, 1);
  });

  it("preserves all fields", () => {
    const state = { variables: { hp: 10 }, tokens: ["t1"], zones: [] };
    const clone = cloneState(state);
    assert.deepEqual(clone.variables, { hp: 10 });
    assert.deepEqual(clone.tokens, ["t1"]);
    assert.deepEqual(clone.zones, []);
  });
});

describe("createStepImpact", () => {
  it("returns an empty tracker", () => {
    const impact = createStepImpact();
    assert.equal(impact.affectedPlayerIds.size, 0);
    assert.equal(impact.affectedGlobal, false);
  });

  it("affectedPlayerIds is a Set", () => {
    const impact = createStepImpact();
    assert.ok(impact.affectedPlayerIds instanceof Set);
  });
});

describe("buildStep", () => {
  function makeState() {
    return {
      turn: { turn: 3, phase: "main", currentPlayer: 2 },
      variables: {},
      tokens: [],
      zones: [],
    };
  }

  it("includes turn metadata", () => {
    const step = buildStep(makeState(), "attack", 5);
    assert.equal(step.turn, 3);
    assert.equal(step.phase, "main");
    assert.equal(step.playerId, 2);
    assert.equal(step.actionId, "attack");
    assert.equal(step.legalActionCount, 5);
  });

  it("includes a cloned state", () => {
    const state = makeState();
    const step = buildStep(state, "attack", 5);
    assert.deepEqual(step.state, state);
    step.state.turn.turn = 999;
    assert.equal(state.turn.turn, 3);
  });

  it("sorts affectedPlayerIds", () => {
    const impact = createStepImpact();
    impact.affectedPlayerIds.add(3);
    impact.affectedPlayerIds.add(1);
    const step = buildStep(makeState(), "a", 1, impact);
    assert.deepEqual(step.affectedPlayerIds, [1, 3]);
  });

  it("defaults impact when not provided", () => {
    const step = buildStep(makeState(), null, 0);
    assert.deepEqual(step.affectedPlayerIds, []);
    assert.equal(step.affectedGlobal, false);
  });

  it("treats null phase as null", () => {
    const state = makeState();
    state.turn.phase = undefined;
    const step = buildStep(state, "a", 1);
    assert.equal(step.phase, null);
  });
});

describe("applyAction", () => {
  function makeMinimalDefinition() {
    return { state: { variables: [] }, turn: {} };
  }

  it("does not throw for an action with no costs or effects", () => {
    const definition = makeMinimalDefinition();
    const state = { variables: {}, tokens: [], zones: [] };
    const action = {};
    assert.doesNotThrow(() => applyAction(definition, state, action, {}));
  });

  it("does not throw for an action with empty costs and effects", () => {
    const definition = makeMinimalDefinition();
    const state = { variables: {}, tokens: [], zones: [] };
    const action = { costs: [], effects: [] };
    assert.doesNotThrow(() => applyAction(definition, state, action, {}));
  });

  it("uses explicit args as bindings when args are non-empty", () => {
    const definition = {
      state: { variables: [] },
      turn: {},
      tokenTypes: [{ id: "unit", attributes: [{ id: "hp", type: { kind: "int" }, initial: 10 }] }],
    };
    const state = {
      variables: {},
      tokens: {
        token_1: { type: "unit", attributes: { hp: 10 } },
        token_2: { type: "unit", attributes: { hp: 10 } },
      },
      zones: {
        board: {
          scope: "shared",
          tokens: ["token_1", "token_2"],
        },
      },
    };
    const action = {
      id: "attack",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [
        { kind: "destroy", target: { kind: "token", id: "t" } },
      ],
    };
    const context = { playerId: 1 };
    const args = { t: "token_2" };

    const result = applyAction(definition, state, action, context, args);
    assert.ok(!result.costAborted);
    assert.equal(state.tokens.token_2, undefined, "token_2 should be destroyed via args binding");
    assert.ok(state.tokens.token_1, "token_1 should remain untouched");
  });

  it("falls back to resolveActionTargets when args are empty", () => {
    const definition = {
      state: { variables: [] },
      turn: {},
      tokenTypes: [{ id: "unit", attributes: [{ id: "hp", type: { kind: "int" }, initial: 10 }] }],
    };
    const state = {
      variables: {},
      tokens: {
        token_1: { type: "unit", attributes: { hp: 10 } },
        token_2: { type: "unit", attributes: { hp: 10 } },
      },
      zones: {
        board: {
          scope: "shared",
          tokens: ["token_1", "token_2"],
        },
      },
    };
    const action = {
      id: "attack",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [
        { kind: "destroy", target: { kind: "token", id: "t" } },
      ],
    };
    const context = { playerId: 1 };

    // Empty args — should fall back to resolveActionTargets (auto-picks first match)
    const result = applyAction(definition, state, action, context, {});
    assert.ok(!result.costAborted);
    // resolveActionTargets picks the first token in the domain (token_1)
    assert.equal(state.tokens.token_1, undefined, "token_1 should be destroyed via auto-resolve");
    assert.ok(state.tokens.token_2, "token_2 should remain");
  });

  it("falls back to resolveActionTargets when args are undefined", () => {
    const definition = {
      state: { variables: [] },
      turn: {},
    };
    const state = { variables: {}, tokens: {}, zones: {} };
    const action = { id: "noop", effects: [] };
    const context = {};

    // No args at all — should not throw
    assert.doesNotThrow(() => applyAction(definition, state, action, context));
    assert.doesNotThrow(() => applyAction(definition, state, action, context, undefined));
  });

  it("no-param action works with empty args", () => {
    const definition = {
      state: {
        variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
      },
      turn: {},
    };
    const state = { variables: { global: { counter: 0 } }, tokens: {}, zones: {} };
    const action = {
      id: "tick",
      effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
    };
    const context = { playerId: 1 };

    const result = applyAction(definition, state, action, context, {});
    assert.ok(!result.costAborted);
    assert.equal(state.variables.global.counter, 1);
  });
});

describe("applyAfterActionTriggers", () => {
  it("does not throw when definition has no triggers", () => {
    const definition = { state: { variables: [] }, turn: {} };
    const state = { variables: {}, tokens: [], zones: [] };
    assert.doesNotThrow(() => applyAfterActionTriggers(definition, state, {}));
  });
});
