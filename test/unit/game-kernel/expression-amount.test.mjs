import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 10 },
      { id: "bonus", scope: "per_player", type: { kind: "int", min: 0, max: 50 }, initial: 3 },
      { id: "global_mult", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 2 },
    ],
    tokenTypes: [
      { id: "die", attributes: [
        { id: "pip_value", scope: "global", type: { kind: "int", min: 1, max: 6 }, initial: 4 },
      ] },
    ],
    zones: [],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

function makeContext(state, definition) {
  const variableIndex = buildVariableIndex(definition);
  return {
    state,
    playerId: 1,
    variableIndex,
  };
}

describe("expression-based effect amounts", () => {
  describe("backward compatibility", () => {
    it("inc with literal number amount works as before", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 5 },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 15);
    });

    it("dec with literal number amount works as before", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        { kind: "dec", target: { kind: "var", id: "score" }, amount: 3 },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 7);
    });

    it("inc with omitted amount defaults to 0", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "score" } },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 10);
    });
  });

  describe("variable ref amount", () => {
    it("inc with per-player variable ref reads the variable value", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      // bonus is 3 for player 1
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "var", id: "bonus" } },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 13); // 10 + 3
    });

    it("dec with global variable ref reads the variable value", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      // global_mult is 2
      const result = applyEffect(
        state,
        {
          kind: "dec",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "var", id: "global_mult" } },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 8); // 10 - 2
    });
  });

  describe("token attribute ref amount", () => {
    it("inc with token attribute ref reads the attribute value", () => {
      const state = createInitialState(baseDefinition);
      // Manually add a token instance with pip_value = 4
      state.tokens = {
        t1: { id: "t1", type: "die", attributes: { pip_value: 4 }, revealed: true },
      };
      const ctx = makeContext(state, baseDefinition);
      ctx.bindings = { myDie: "t1" };
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "token", id: "myDie", attribute: "pip_value" } },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 14); // 10 + 4
    });
  });

  describe("expression amount (arith)", () => {
    it("dec with arithmetic expression evaluates and uses result", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      // amount = bonus * global_mult => 3 * 2 = 6
      const result = applyEffect(
        state,
        {
          kind: "dec",
          target: { kind: "var", id: "score" },
          amount: {
            kind: "arith",
            op: "*",
            left: { kind: "ref", ref: { kind: "var", id: "bonus" } },
            right: { kind: "ref", ref: { kind: "var", id: "global_mult" } },
          },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 4); // 10 - 6
    });

    it("inc with value literal expression works", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "value", value: 7 },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.perPlayer[1].score, 17); // 10 + 7
    });
  });

  describe("graceful failure", () => {
    it("amount resolving to undefined (bad ref) returns non-numeric-target", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "var", id: "nonexistent" } },
        },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, "non-numeric-target");
      // score unchanged
      assert.equal(state.variables.perPlayer[1].score, 10);
    });

    it("amount resolving to non-number (boolean) returns non-numeric-target", () => {
      const defWithBool = {
        ...baseDefinition,
        state: {
          ...baseDefinition.state,
          variables: [
            ...baseDefinition.state.variables,
            { id: "flag", scope: "global", type: { kind: "bool" }, initial: true },
          ],
        },
      };
      const state = createInitialState(defWithBool);
      const ctx = makeContext(state, defWithBool);
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "var", id: "flag" } },
        },
        ctx,
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, "non-numeric-target");
    });
  });

  describe("appliedEffect records resolved amount", () => {
    it("appliedEffect.amount is the resolved number, not the expression", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeContext(state, baseDefinition);
      const result = applyEffect(
        state,
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: { kind: "ref", ref: { kind: "var", id: "bonus" } },
        },
        ctx,
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.amount, 3);
      assert.equal(typeof result.appliedEffect.amount, "number");
    });
  });
});
