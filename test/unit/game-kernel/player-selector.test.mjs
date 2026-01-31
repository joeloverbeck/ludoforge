import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolvePlayerSelector,
  autoBindParams,
} from "../../../src/game-kernel/selectors.js";

function makeState(agents) {
  return { agents };
}

function makeContext(playerId, opts = {}) {
  return { playerId, bindings: {}, ...opts };
}

describe("resolvePlayerSelector", () => {
  const agents = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const state = makeState(agents);

  it("returns non-self player IDs for opponent", () => {
    const ids = resolvePlayerSelector(
      { player: "opponent" },
      state,
      makeContext(1)
    );
    assert.deepEqual(ids, [2, 3]);
  });

  it("returns active player ID for self", () => {
    const ids = resolvePlayerSelector(
      { player: "self" },
      state,
      makeContext(2)
    );
    assert.deepEqual(ids, [2]);
  });

  it("returns all player IDs when no player spec", () => {
    const ids = resolvePlayerSelector({}, state, makeContext(1));
    assert.deepEqual(ids, [1, 2, 3]);
  });

  it("respects count to limit results", () => {
    const ids = resolvePlayerSelector(
      { player: "opponent", count: 1 },
      state,
      makeContext(1)
    );
    assert.equal(ids.length, 1);
    assert.notEqual(ids[0], 1);
  });

  it("returns deterministic order (no random shuffle)", () => {
    const ids = resolvePlayerSelector(
      { player: "opponent", count: 1 },
      state,
      makeContext(1)
    );
    assert.equal(ids.length, 1);
    assert.equal(ids[0], 2);

    // Repeated calls return same order
    const ids2 = resolvePlayerSelector(
      { player: "opponent", count: 1 },
      state,
      makeContext(1)
    );
    assert.deepEqual(ids, ids2);
  });

  it("returns empty array when no agents", () => {
    const ids = resolvePlayerSelector(
      { player: "opponent" },
      makeState([]),
      makeContext(1)
    );
    assert.deepEqual(ids, []);
  });
});

describe("autoBindParams with kind: player", () => {
  it("stores resolved player ID in bindings", () => {
    const state = makeState([{ id: 1 }, { id: 2 }]);
    const params = [
      { id: "victim", kind: "player", domain: { values: "opponent" } },
    ];
    const context = makeContext(1);

    const bindings = autoBindParams(params, state, context);
    assert.equal(bindings.victim, 2);
  });

  it("does not overwrite bindings when no players match", () => {
    const state = makeState([{ id: 1 }]);
    const params = [
      { id: "victim", kind: "player", domain: { values: "opponent" } },
    ];
    const context = makeContext(1);

    const bindings = autoBindParams(params, state, context);
    assert.equal(bindings.victim, undefined);
  });

  it("handles mixed player and token params", () => {
    const state = {
      agents: [{ id: 1 }, { id: 2 }],
      zones: {
        hand: {
          scope: "per_player",
          tokensByPlayer: { 1: ["t1"] },
        },
      },
      tokens: { t1: { id: "t1", type: "card" } },
    };
    const params = [
      { id: "victim", kind: "player", domain: { values: "opponent" } },
      { id: "card", kind: "token", domain: { selector: { zone: "hand", player: "self" } } },
    ];
    const context = makeContext(1);

    const bindings = autoBindParams(params, state, context);
    assert.equal(bindings.victim, 2);
    assert.equal(bindings.card, "t1");
  });
});
