import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, allocateTokenId } from "../../../src/game-kernel/state.js";
import {
  applyTokenSpawn,
  applyTokenMove,
  applyTokenDestroy,
  applyTokenReveal,
  applyTokenHide,
  findTokenZone,
  getZoneTokens,
} from "../../../src/game-kernel/token-effects.js";

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
          { id: "color", scope: "global", type: { kind: "enum", values: ["red", "blue"] }, initial: "red" },
        ],
      },
    ],
    zones: [
      { id: "hand", tokenType: "card", scope: "per_player", order: "ordered", visibility: "private" },
      { id: "board", tokenType: "card", scope: "global", order: "ordered", visibility: "public" },
      {
        id: "map",
        tokenType: "card",
        scope: "global",
        order: "ordered",
        visibility: "public",
        spatial: { nodes: ["A", "B", "C"], edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }] },
      },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [], maxTurns: 10 },
};

function makeContext(state, playerId = 1) {
  return { state, playerId, definition: baseDefinition };
}

describe("token-effects", () => {
  describe("applyTokenSpawn", () => {
    it("spawns a token into a global zone", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" };
      const result = applyTokenSpawn(state, effect, makeContext(state));

      assert.equal(result.ok, true);
      assert.ok(result.appliedEffect);
      assert.equal(result.appliedEffect.kind, "spawn");
      assert.equal(result.appliedEffect.toZone, "board");

      const tokenId = result.appliedEffect.tokenId;
      assert.ok(state.tokens[tokenId]);
      assert.equal(state.tokens[tokenId].type, "card");
      assert.equal(state.tokens[tokenId].attributes.cost, 1);
      assert.equal(state.tokens[tokenId].attributes.color, "red");
      assert.equal(state.tokens[tokenId].revealed, true);
      assert.ok(state.zones.board.tokens.includes(tokenId));
    });

    it("spawns a token into a per_player zone", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "hand" };
      const result = applyTokenSpawn(state, effect, makeContext(state, 2));

      assert.equal(result.ok, true);
      const tokenId = result.appliedEffect.tokenId;
      assert.ok(state.zones.hand.tokensByPlayer[2].includes(tokenId));
    });

    it("sets initial node for spatial zones", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "map" };
      const result = applyTokenSpawn(state, effect, makeContext(state));

      assert.equal(result.ok, true);
      const tokenId = result.appliedEffect.tokenId;
      assert.equal(state.tokens[tokenId].node, "A");
    });

    it("fails for unknown zone", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "nonexistent" };
      const result = applyTokenSpawn(state, effect, makeContext(state));

      assert.equal(result.ok, false);
      assert.equal(result.reason, "unknown-zone");
    });

    it("fails when toZone is missing", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" } };
      const result = applyTokenSpawn(state, effect, makeContext(state));

      assert.equal(result.ok, false);
      assert.equal(result.reason, "missing-spawn-params");
    });

    it("allocates incrementing token IDs", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" };
      const r1 = applyTokenSpawn(state, effect, makeContext(state));
      const r2 = applyTokenSpawn(state, effect, makeContext(state));

      assert.notEqual(r1.appliedEffect.tokenId, r2.appliedEffect.tokenId);
    });

    it("initializes empty flags on spawned token", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" };
      const result = applyTokenSpawn(state, effect, makeContext(state));

      const tokenId = result.appliedEffect.tokenId;
      assert.deepEqual(state.tokens[tokenId].flags, {});
    });
  });

  describe("applyTokenMove", () => {
    it("moves a token between zones", () => {
      const state = createInitialState(baseDefinition);
      const spawnEffect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" };
      const spawnResult = applyTokenSpawn(state, spawnEffect, makeContext(state));
      const tokenId = spawnResult.appliedEffect.tokenId;

      const moveEffect = { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand" };
      const result = applyTokenMove(state, moveEffect, makeContext(state));

      assert.equal(result.ok, true);
      assert.ok(!state.zones.board.tokens.includes(tokenId));
      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });

    it("fails for unknown token", () => {
      const state = createInitialState(baseDefinition);
      const effect = { kind: "move", target: { kind: "token", id: "nonexistent" }, toZone: "board" };
      const result = applyTokenMove(state, effect, makeContext(state));

      assert.equal(result.ok, false);
      assert.equal(result.reason, "token-not-found");
    });

    it("fails for unknown destination zone", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const effect = { kind: "move", target: { kind: "token", id: tokenId }, toZone: "nonexistent" };
      const result = applyTokenMove(state, effect, makeContext(state));

      assert.equal(result.ok, false);
      assert.equal(result.reason, "unknown-zone");
    });

    it("resolves bindings for token ID", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const ctx = { ...makeContext(state), bindings: { myCard: tokenId } };
      const effect = { kind: "move", target: { kind: "token", id: "myCard" }, toZone: "hand" };
      const result = applyTokenMove(state, effect, ctx);

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });
  });

  describe("applyTokenDestroy", () => {
    it("removes a token from state and zone", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const result = applyTokenDestroy(
        state,
        { kind: "destroy", target: { kind: "token", id: tokenId } },
        makeContext(state)
      );

      assert.equal(result.ok, true);
      assert.equal(state.tokens[tokenId], undefined);
      assert.ok(!state.zones.board.tokens.includes(tokenId));
    });

    it("fails for unknown token", () => {
      const state = createInitialState(baseDefinition);
      const result = applyTokenDestroy(
        state,
        { kind: "destroy", target: { kind: "token", id: "nonexistent" } },
        makeContext(state)
      );

      assert.equal(result.ok, false);
      assert.equal(result.reason, "token-not-found");
    });
  });

  describe("applyTokenReveal / applyTokenHide", () => {
    it("reveals a hidden token", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;
      state.tokens[tokenId].revealed = false;

      const result = applyTokenReveal(
        state,
        { kind: "reveal", target: { kind: "token", id: tokenId } },
        makeContext(state)
      );

      assert.equal(result.ok, true);
      assert.equal(state.tokens[tokenId].revealed, true);
    });

    it("hides a revealed token", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const result = applyTokenHide(
        state,
        { kind: "hide", target: { kind: "token", id: tokenId } },
        makeContext(state)
      );

      assert.equal(result.ok, true);
      assert.equal(state.tokens[tokenId].revealed, false);
    });

    it("fails for unknown token on reveal", () => {
      const state = createInitialState(baseDefinition);
      const result = applyTokenReveal(
        state,
        { kind: "reveal", target: { kind: "token", id: "nonexistent" } },
        makeContext(state)
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, "token-not-found");
    });
  });

  describe("findTokenZone", () => {
    it("finds token in a global zone", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
        makeContext(state)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const location = findTokenZone(state, tokenId);
      assert.ok(location);
      assert.equal(location.zone.id, "board");
    });

    it("finds token in a per_player zone", () => {
      const state = createInitialState(baseDefinition);
      const spawnResult = applyTokenSpawn(
        state,
        { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "hand" },
        makeContext(state, 2)
      );
      const tokenId = spawnResult.appliedEffect.tokenId;

      const location = findTokenZone(state, tokenId);
      assert.ok(location);
      assert.equal(location.zone.id, "hand");
      assert.equal(location.playerId, 2);
    });

    it("returns null for unknown token", () => {
      const state = createInitialState(baseDefinition);
      const location = findTokenZone(state, "nonexistent");
      assert.equal(location, null);
    });
  });

  describe("getZoneTokens", () => {
    it("returns tokens array for global zone", () => {
      const state = createInitialState(baseDefinition);
      const tokens = getZoneTokens(state.zones.board);
      assert.deepEqual(tokens, []);
    });

    it("returns player tokens for per_player zone", () => {
      const state = createInitialState(baseDefinition);
      const tokens = getZoneTokens(state.zones.hand, 1);
      assert.deepEqual(tokens, []);
    });
  });

  describe("applyTokenMove with toPlayer", () => {
    const threePlayerDef = {
      ...baseDefinition,
      players: { count: 3 },
    };

    function makeCtx(state, playerId = 1, def = baseDefinition) {
      return { state, playerId, definition: def };
    }

    function spawnToBoard(state, ctx) {
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" };
      return applyTokenSpawn(state, effect, ctx);
    }

    it("moves token to self (same as acting player)", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeCtx(state, 1);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "self" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
      assert.ok(!state.zones.hand.tokensByPlayer[2].includes(tokenId));
    });

    it("moves token to opponent in a 2-player game", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeCtx(state, 1);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "opponent" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[2].includes(tokenId));
      assert.ok(!state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });

    it("moves token to next player with wrapping", () => {
      const state = createInitialState(threePlayerDef);
      const ctx = makeCtx(state, 3, threePlayerDef);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "next" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });

    it("moves token to previous player with wrapping", () => {
      const state = createInitialState(threePlayerDef);
      const ctx = makeCtx(state, 1, threePlayerDef);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "previous" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[3].includes(tokenId));
    });

    it("without toPlayer works exactly as before (backward-compatible)", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeCtx(state, 1);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });

    it("ignores toPlayer when targeting a global zone", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeCtx(state, 1);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "hand" };
      const tokenId = applyTokenSpawn(state, effect, ctx).appliedEffect.tokenId;

      const result = applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "board", toPlayer: "opponent" },
        ctx
      );

      assert.equal(result.ok, true);
      assert.ok(state.zones.board.tokens.includes(tokenId));
    });

    it("conserves token count across inter-player move", () => {
      const state = createInitialState(baseDefinition);
      const ctx = makeCtx(state, 1);
      const effect = { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "hand" };
      const tokenId = applyTokenSpawn(state, effect, ctx).appliedEffect.tokenId;

      const totalBefore = Object.keys(state.tokens).length;

      applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "opponent" },
        ctx
      );

      const totalAfter = Object.keys(state.tokens).length;
      assert.equal(totalBefore, totalAfter);
      assert.ok(state.zones.hand.tokensByPlayer[2].includes(tokenId));
      assert.ok(!state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });

    it("next player wraps correctly for player 2 of 3", () => {
      const state = createInitialState(threePlayerDef);
      const ctx = makeCtx(state, 2, threePlayerDef);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "next" },
        ctx
      );

      assert.ok(state.zones.hand.tokensByPlayer[3].includes(tokenId));
    });

    it("previous player wraps correctly for player 2 of 3", () => {
      const state = createInitialState(threePlayerDef);
      const ctx = makeCtx(state, 2, threePlayerDef);
      const tokenId = spawnToBoard(state, ctx).appliedEffect.tokenId;

      applyTokenMove(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "previous" },
        ctx
      );

      assert.ok(state.zones.hand.tokensByPlayer[1].includes(tokenId));
    });
  });
});
