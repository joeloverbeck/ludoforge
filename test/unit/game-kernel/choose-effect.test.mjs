import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
      { id: "gold", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
      { id: "hp", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 10 },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

function makeContext(state, playerId = 1, rng = undefined) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
    rng,
  };
}

function createDeterministicRng(sequence) {
  let idx = 0;
  return {
    nextInt(bound) {
      const value = sequence[idx % sequence.length] % bound;
      idx += 1;
      return value;
    },
  };
}

describe("choose effect", () => {
  it("applies exactly one option's effects with count: 1", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 5 }],
        [{ kind: "inc", target: { kind: "var", id: "gold" }, amount: 10 }],
      ],
      count: 1,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.kind, "rng_choose");
    assert.equal(result.appliedEffect.selected, 1);
    assert.equal(state.variables.global.score, 5);
    assert.equal(state.variables.global.gold, 0);
  });

  it("selects deterministically with seeded RNG", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([1]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 5 }],
        [{ kind: "inc", target: { kind: "var", id: "gold" }, amount: 10 }],
      ],
      count: 1,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 0);
    assert.equal(state.variables.global.gold, 10);
  });

  it("applies two distinct options with count: 2", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0, 0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        [{ kind: "inc", target: { kind: "var", id: "gold" }, amount: 2 }],
        [{ kind: "inc", target: { kind: "var", id: "hp" }, amount: 3 }],
      ],
      count: 2,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.selected, 2);
    assert.equal(state.variables.global.score, 1);
    assert.equal(state.variables.global.gold, 2);
    assert.equal(state.variables.global.hp, 10);
  });

  it("is a no-op with 0 options", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const effect = {
      kind: "rng_choose",
      options: [],
      count: 1,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.appliedEffect.selected, []);
    assert.deepStrictEqual(result.appliedEffect.applied, []);
    assert.equal(state.variables.global.score, 0);
  });

  it("works nested inside a conditional effect", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "conditional",
      condition: { kind: "value", value: true },
      then: [
        {
          kind: "rng_choose",
          options: [
            [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 7 }],
            [{ kind: "inc", target: { kind: "var", id: "gold" }, amount: 3 }],
          ],
          count: 1,
        },
      ],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 7);
    assert.equal(state.variables.global.gold, 0);
  });

  it("defaults count to 1 when not specified", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        [{ kind: "inc", target: { kind: "var", id: "gold" }, amount: 2 }],
      ],
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.selected, 1);
    assert.equal(state.variables.global.score, 1);
    assert.equal(state.variables.global.gold, 0);
  });

  it("does not select more options than available", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0, 0, 0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      ],
      count: 3,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.selected, 1);
    assert.equal(state.variables.global.score, 1);
  });

  it("applies multiple sub-effects from a single chosen option", () => {
    const state = createInitialState(baseDefinition);
    const rng = createDeterministicRng([0]);
    const ctx = makeContext(state, 1, rng);

    const effect = {
      kind: "rng_choose",
      options: [
        [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 3 },
          { kind: "inc", target: { kind: "var", id: "gold" }, amount: 5 },
        ],
        [
          { kind: "inc", target: { kind: "var", id: "hp" }, amount: 2 },
        ],
      ],
      count: 1,
    };

    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(state.variables.global.score, 3);
    assert.equal(state.variables.global.gold, 5);
    assert.equal(state.variables.global.hp, 10);
  });
});
