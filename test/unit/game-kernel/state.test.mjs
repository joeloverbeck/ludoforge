import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allocateTokenId, createInitialState } from "../../../src/game-kernel/state.js";

const baseDefinition = {
  version: "1.0",
  players: {
    count: 2,
    roles: ["north", "south"],
    teams: [["north"], ["south"]],
  },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int" }, initial: 0 },
      { id: "health", scope: "per_player", type: { kind: "int" }, initial: 10 },
    ],
    tokenTypes: [{ id: "card", attributes: [] }],
    zones: [
      {
        id: "deck",
        tokenType: "card",
        scope: "global",
        order: "ordered",
        visibility: "private",
      },
      {
        id: "hand",
        tokenType: "card",
        scope: "per_player",
        order: "unordered",
        visibility: "private",
      },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  termination: { conditions: [] },
};

describe("state", () => {
  describe("createInitialState", () => {
    it("is deterministic and preserves zone order", () => {
      const first = createInitialState(baseDefinition);
      const second = createInitialState(baseDefinition);

      assert.deepEqual(first, second);
      assert.equal(first.zones.deck.order, "ordered");
      assert.equal(first.zones.hand.order, "unordered");
    });

    it("expands per-player variables and zones from defaults", () => {
      const state = createInitialState(baseDefinition);

      assert.equal(state.variables.global.score, 0);
      assert.deepEqual(state.variables.perPlayer[1], { health: 10 });
      assert.deepEqual(state.variables.perPlayer[2], { health: 10 });
      assert.deepEqual(state.zones.hand.tokensByPlayer[1], []);
      assert.deepEqual(state.zones.hand.tokensByPlayer[2], []);
    });

    it("initialises round to 1", () => {
      const state = createInitialState(baseDefinition);

      assert.equal(state.turn.round, 1);
      assert.equal(typeof state.turn.round, "number");
    });
  });

  describe("allocateTokenId", () => {
    it("is monotonic within an initialized state", () => {
      const state = createInitialState(baseDefinition);

      const firstId = allocateTokenId(state);
      const secondId = allocateTokenId(state);

      assert.notEqual(firstId, secondId);
      assert.equal(firstId, "t1");
      assert.equal(secondId, "t2");
    });
  });
});
