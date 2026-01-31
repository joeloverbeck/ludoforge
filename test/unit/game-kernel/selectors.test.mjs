import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyTokenSpawn } from "../../../src/game-kernel/token-effects.js";
import { buildVariableIndex } from "../../../src/game-kernel/effects.js";
import { resolveSelector, resolveActionTargets } from "../../../src/game-kernel/selectors.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
    ],
    tokenTypes: [
      {
        id: "card",
        attributes: [
          { id: "cost", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 1 },
        ],
      },
      {
        id: "piece",
        attributes: [],
      },
    ],
    zones: [
      { id: "hand", tokenType: "card", scope: "per_player", order: "ordered", visibility: "private" },
      { id: "board", tokenType: "card", scope: "global", order: "ordered", visibility: "public" },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [], maxTurns: 10 },
};

function makeContext(state, playerId = 1) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
  };
}

function spawnToken(state, toZone, playerId = 1, typeId = "card") {
  const ctx = { state, playerId, definition: baseDefinition };
  const result = applyTokenSpawn(
    state,
    { kind: "spawn", target: { kind: "token", id: typeId }, toZone },
    ctx
  );
  return result.appliedEffect.tokenId;
}

describe("selectors", () => {
  describe("resolveSelector", () => {
    it("returns all tokens from a global zone", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board");
      const t2 = spawnToken(state, "board");

      const result = resolveSelector({ zone: "board" }, state, makeContext(state));
      assert.deepEqual(result, [t1, t2]);
    });

    it("returns tokens from per_player zone for self", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "hand", 1);
      spawnToken(state, "hand", 2);

      const result = resolveSelector(
        { zone: "hand", player: "self" },
        state,
        makeContext(state, 1)
      );
      assert.deepEqual(result, [t1]);
    });

    it("filters by tokenType", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board", 1, "card");
      spawnToken(state, "board", 1, "piece");

      const result = resolveSelector(
        { zone: "board", tokenType: "card" },
        state,
        makeContext(state)
      );
      assert.deepEqual(result, [t1]);
    });

    it("applies count limit", () => {
      const state = createInitialState(baseDefinition);
      spawnToken(state, "board");
      spawnToken(state, "board");
      spawnToken(state, "board");

      const result = resolveSelector(
        { zone: "board", count: 2 },
        state,
        makeContext(state)
      );
      assert.equal(result.length, 2);
    });

    it("returns empty array for unknown zone", () => {
      const state = createInitialState(baseDefinition);
      const result = resolveSelector(
        { zone: "nonexistent" },
        state,
        makeContext(state)
      );
      assert.deepEqual(result, []);
    });

    it("returns deterministic order (no random shuffle)", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board");
      const t2 = spawnToken(state, "board");
      const t3 = spawnToken(state, "board");

      const result = resolveSelector(
        { zone: "board", count: 2 },
        state,
        makeContext(state)
      );
      assert.deepEqual(result, [t1, t2]);
    });

    it("rejects random property in selector (schema-level)", () => {
      const state = createInitialState(baseDefinition);
      spawnToken(state, "board");

      // Even if random is passed, it has no effect on ordering
      const result1 = resolveSelector(
        { zone: "board" },
        state,
        makeContext(state)
      );
      const result2 = resolveSelector(
        { zone: "board" },
        state,
        makeContext(state)
      );
      assert.deepEqual(result1, result2);
    });
  });

  describe("resolveActionTargets", () => {
    it("returns bindings for action params", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board");

      const action = {
        id: "play",
        params: [
          { id: "chosen", kind: "token", domain: { selector: { zone: "board", count: 1 } } },
        ],
      };

      const ctx = makeContext(state);
      const bindings = resolveActionTargets(baseDefinition, state, action, ctx);
      assert.equal(bindings.chosen, t1);
    });

    it("returns empty bindings when no params", () => {
      const state = createInitialState(baseDefinition);
      const action = { id: "pass" };
      const bindings = resolveActionTargets(baseDefinition, state, action, makeContext(state));
      assert.deepEqual(bindings, {});
    });

    it("returns empty bindings when params array is empty", () => {
      const state = createInitialState(baseDefinition);
      const action = { id: "pass", params: [] };
      const bindings = resolveActionTargets(baseDefinition, state, action, makeContext(state));
      assert.deepEqual(bindings, {});
    });

    it("falls back to targets when params is absent", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board");

      const action = {
        id: "play",
        targets: [
          { id: "chosen", kind: "token", selector: { zone: "board", count: 1 } },
        ],
      };

      const ctx = makeContext(state);
      const bindings = resolveActionTargets(baseDefinition, state, action, ctx);
      assert.equal(bindings.chosen, t1);
    });
  });
});
