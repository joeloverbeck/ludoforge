import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolvePlayerSelector,
  resolveActionTargets,
} from "../../../src/game-kernel/selectors.js";
import { buildVariableIndex } from "../../../src/game-kernel/effects.js";

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

  it("shuffles with random and rng", () => {
    let callCount = 0;
    const rng = () => {
      callCount += 1;
      return 0.99;
    };
    const ids = resolvePlayerSelector(
      { player: "opponent", random: true, count: 1 },
      state,
      makeContext(1, { rng })
    );
    assert.equal(ids.length, 1);
    assert.ok(callCount > 0);
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

describe("resolveActionTargets with kind: player", () => {
  it("stores resolved player ID in bindings", () => {
    const definition = {
      state: { variables: [{ id: "hp", scope: "per_player", type: { kind: "int" }, initial: 10 }] },
    };
    const state = makeState([{ id: 1 }, { id: 2 }]);
    const action = {
      targets: [
        { id: "victim", kind: "player", selector: { player: "opponent" } },
      ],
    };
    const context = makeContext(1);

    const bindings = resolveActionTargets(definition, state, action, context);
    assert.equal(bindings.victim, 2);
  });

  it("does not overwrite bindings when no players match", () => {
    const definition = {
      state: { variables: [] },
    };
    const state = makeState([{ id: 1 }]);
    const action = {
      targets: [
        { id: "victim", kind: "player", selector: { player: "opponent" } },
      ],
    };
    const context = makeContext(1);

    const bindings = resolveActionTargets(definition, state, action, context);
    assert.equal(bindings.victim, undefined);
  });

  it("handles mixed player and token targets", () => {
    const definition = {
      state: { variables: [] },
    };
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
    const action = {
      targets: [
        { id: "victim", kind: "player", selector: { player: "opponent" } },
        { id: "card", kind: "token", selector: { zone: "hand", player: "self" } },
      ],
    };
    const context = makeContext(1);

    const bindings = resolveActionTargets(definition, state, action, context);
    assert.equal(bindings.victim, 2);
    assert.equal(bindings.card, "t1");
  });
});
