import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyTokenReveal,
  applyTokenHide,
} from "../../../src/game-kernel/token-effects.js";

function makeGlobalZoneState(tokenId) {
  return {
    tokens: {
      [tokenId]: { id: tokenId, type: "card", revealed: false, flags: {} },
    },
    zones: {
      board: {
        scope: "global",
        tokens: [tokenId],
      },
    },
  };
}

function makePerPlayerZoneState(tokenId, ownerId) {
  return {
    tokens: {
      [tokenId]: { id: tokenId, type: "card", revealed: false, flags: {} },
    },
    zones: {
      hand: {
        scope: "per_player",
        tokensByPlayer: {
          [ownerId]: [tokenId],
        },
      },
    },
  };
}

function makeContext(playerId) {
  return {
    playerId,
    bindings: {},
    impact: {
      affectedPlayerIds: new Set(),
      affectedGlobal: false,
    },
  };
}

function makeEffect(kind, tokenId) {
  return {
    kind,
    target: { kind: "token", id: tokenId },
  };
}

describe("token-effects impact recording", () => {
  describe("reveal", () => {
    it("records impact for global zone token (affectedGlobal set)", () => {
      const state = makeGlobalZoneState("t1");
      const context = makeContext(1);

      const result = applyTokenReveal(state, makeEffect("reveal", "t1"), context);
      assert.equal(result.ok, true);
      assert.equal(state.tokens.t1.revealed, true);
      assert.equal(context.impact.affectedGlobal, true);
    });

    it("records impact for per_player zone token (owner's ID added)", () => {
      const state = makePerPlayerZoneState("t1", 2);
      const context = makeContext(1);

      const result = applyTokenReveal(state, makeEffect("reveal", "t1"), context);
      assert.equal(result.ok, true);
      assert.ok(context.impact.affectedPlayerIds.has(2));
    });

    it("works when no impact tracker in context (no crash)", () => {
      const state = makeGlobalZoneState("t1");
      const context = { playerId: 1, bindings: {} };

      const result = applyTokenReveal(state, makeEffect("reveal", "t1"), context);
      assert.equal(result.ok, true);
      assert.equal(state.tokens.t1.revealed, true);
    });
  });

  describe("hide", () => {
    it("records impact for global zone token (affectedGlobal set)", () => {
      const state = makeGlobalZoneState("t1");
      state.tokens.t1.revealed = true;
      const context = makeContext(1);

      const result = applyTokenHide(state, makeEffect("hide", "t1"), context);
      assert.equal(result.ok, true);
      assert.equal(state.tokens.t1.revealed, false);
      assert.equal(context.impact.affectedGlobal, true);
    });

    it("records impact for per_player zone token (owner's ID added)", () => {
      const state = makePerPlayerZoneState("t1", 2);
      state.tokens.t1.revealed = true;
      const context = makeContext(1);

      const result = applyTokenHide(state, makeEffect("hide", "t1"), context);
      assert.equal(result.ok, true);
      assert.ok(context.impact.affectedPlayerIds.has(2));
    });

    it("works when no impact tracker in context (no crash)", () => {
      const state = makeGlobalZoneState("t1");
      state.tokens.t1.revealed = true;
      const context = { playerId: 1, bindings: {} };

      const result = applyTokenHide(state, makeEffect("hide", "t1"), context);
      assert.equal(result.ok, true);
      assert.equal(state.tokens.t1.revealed, false);
    });
  });
});
