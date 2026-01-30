import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";
import { applyTokenSpawn } from "../../../src/game-kernel/token-effects.js";
import { applyTriggers } from "../../../src/game-kernel/triggers.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
    ],
    tokenTypes: [
      { id: "card", attributes: [] },
    ],
    zones: [
      { id: "board", tokenType: "card", scope: "global", order: "ordered", visibility: "public" },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

function makeContext(state, playerId = 1) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
  };
}

describe("conditional effect", () => {
  it("applies then effects when condition is true", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);
    const effect = {
      kind: "conditional",
      condition: { kind: "value", value: true },
      then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      else: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 3 }],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 1);
  });

  it("applies else effects when condition is false", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);
    const effect = {
      kind: "conditional",
      condition: { kind: "value", value: false },
      then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      else: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 4 }],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 4);
  });

  it("does nothing when condition is false and else is missing", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);
    const effect = {
      kind: "conditional",
      condition: { kind: "value", value: false },
      then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 2 }],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 0);
    assert.equal(result.appliedEffect.applied.length, 0);
  });

  it("supports nested conditional effects", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);
    const effect = {
      kind: "conditional",
      condition: { kind: "value", value: true },
      then: [
        {
          kind: "conditional",
          condition: { kind: "value", value: false },
          then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
          else: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 2 }],
        },
      ],
      else: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 5 }],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 2);
  });

  it("uses zone_query conditions", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);
    const effect = {
      kind: "conditional",
      condition: {
        kind: "cmp",
        op: ">",
        left: { kind: "ref", ref: { kind: "zone_query", id: "board", query: "count" } },
        right: { kind: "value", value: 0 },
      },
      then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      else: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 2 }],
    };

    const resultEmpty = applyEffect(state, effect, ctx);
    assert.equal(resultEmpty.ok, true);
    assert.equal(state.variables.global.score, 2);

    applyTokenSpawn(state, { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" }, ctx);
    const resultWithToken = applyEffect(state, effect, ctx);
    assert.equal(resultWithToken.ok, true);
    assert.equal(state.variables.global.score, 3);
  });

  it("runs conditional effects inside triggers", () => {
    const definition = {
      ...baseDefinition,
      triggers: [
        {
          event: "after_action",
          effects: [
            {
              kind: "conditional",
              condition: { kind: "value", value: true },
              then: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
            },
          ],
        },
      ],
    };
    const state = createInitialState(definition);

    const result = applyTriggers(definition, state, "after_action", { playerId: 1 });

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 1);
  });
});
