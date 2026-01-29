import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";
import { applyTriggers } from "../../../src/game-kernel/triggers.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
      { id: "health", scope: "per_player", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      { id: "flag", scope: "global", type: { kind: "bool" }, initial: false },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

describe("effect trace data", () => {
  describe("applyEffect returns appliedEffect", () => {
    it("returns appliedEffect with kind and resolved target for inc", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 10 },
        { state, playerId: null, variableIndex }
      );
      assert.equal(result.ok, true);
      assert.ok(result.appliedEffect);
      assert.equal(result.appliedEffect.kind, "inc");
      assert.deepEqual(result.appliedEffect.target, { kind: "var", id: "score", scope: "global" });
      assert.equal(result.appliedEffect.amount, 10);
    });

    it("returns appliedEffect with kind and resolved target for dec", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "dec", target: { kind: "var", id: "health" }, amount: 2 },
        { state, playerId: 1, variableIndex }
      );
      assert.equal(result.ok, true);
      assert.ok(result.appliedEffect);
      assert.equal(result.appliedEffect.kind, "dec");
      assert.deepEqual(result.appliedEffect.target, { kind: "var", id: "health", scope: "per_player" });
      assert.equal(result.appliedEffect.amount, 2);
    });

    it("returns appliedEffect with value for set", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "set", target: { kind: "var", id: "flag" }, value: true },
        { state, playerId: null, variableIndex }
      );
      assert.equal(result.ok, true);
      assert.ok(result.appliedEffect);
      assert.equal(result.appliedEffect.kind, "set");
      assert.equal(result.appliedEffect.value, true);
    });

    it("does not return appliedEffect on failure", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "health" }, amount: 20 },
        { state, playerId: 1, variableIndex },
        { boundsMode: "reject" }
      );
      assert.equal(result.ok, false);
      assert.equal(result.appliedEffect, undefined);
    });

    it("returns failure for token spawn with unknown zone", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "spawn", target: { kind: "token", id: "t1" }, toZone: "board" },
        { state, playerId: 1, variableIndex }
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, "unknown-zone");
    });

    it("defaults amount to 0 when omitted", () => {
      const state = createInitialState(baseDefinition);
      const variableIndex = buildVariableIndex(baseDefinition);
      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "score" } },
        { state, playerId: null, variableIndex }
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.amount, 0);
    });
  });

  describe("applyTriggers returns appliedEffects", () => {
    it("returns appliedEffects with source trigger for fired triggers", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "after_action",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 5 },
            ],
          },
        ],
      };
      const state = createInitialState(definition);
      const result = applyTriggers(definition, state, "after_action", { playerId: null });
      assert.equal(result.ok, true);
      assert.equal(result.fired, true);
      assert.equal(result.appliedEffects.length, 1);
      assert.equal(result.appliedEffects[0].kind, "inc");
      assert.equal(result.appliedEffects[0].source, "trigger");
      assert.deepEqual(result.appliedEffects[0].target, { kind: "var", id: "score", scope: "global" });
      assert.equal(result.appliedEffects[0].amount, 5);
    });

    it("returns empty appliedEffects when no triggers match", () => {
      const state = createInitialState(baseDefinition);
      const result = applyTriggers(baseDefinition, state, "after_action", {});
      assert.equal(result.ok, true);
      assert.equal(result.fired, false);
      assert.deepEqual(result.appliedEffects, []);
    });

    it("collects appliedEffects from multiple trigger effects in order", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "after_action",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 2 },
            ],
          },
        ],
      };
      const state = createInitialState(definition);
      const result = applyTriggers(definition, state, "after_action", { playerId: null });
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffects.length, 2);
      assert.equal(result.appliedEffects[0].amount, 1);
      assert.equal(result.appliedEffects[0].source, "trigger");
      assert.equal(result.appliedEffects[1].amount, 2);
      assert.equal(result.appliedEffects[1].source, "trigger");
    });

    it("collects appliedEffects from multiple triggered triggers", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "after_action",
            effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 10 }],
          },
          {
            event: "after_action",
            effects: [{ kind: "dec", target: { kind: "var", id: "health" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);
      const result = applyTriggers(definition, state, "after_action", { playerId: 1 });
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffects.length, 2);
      assert.equal(result.appliedEffects[0].kind, "inc");
      assert.equal(result.appliedEffects[1].kind, "dec");
      assert.equal(result.appliedEffects[0].source, "trigger");
      assert.equal(result.appliedEffects[1].source, "trigger");
    });
  });
});
