import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyEffect } from "../../../src/game-kernel/effect-application.js";

function makeVariable(id, scope = "per_player") {
  return { id, scope, type: { kind: "int" }, initial: 10 };
}

function makeState(variables, playerIds = [1, 2]) {
  const perPlayer = {};
  for (const pid of playerIds) {
    perPlayer[pid] = {};
    for (const v of variables) {
      if (v.scope === "per_player") {
        perPlayer[pid][v.id] = v.initial;
      }
    }
  }
  const global = {};
  for (const v of variables) {
    if (v.scope === "global") {
      global[v.id] = v.initial;
    }
  }
  return {
    variables: { global, perPlayer },
    agents: playerIds.map((id) => ({ id })),
    zones: {},
    tokens: {},
  };
}

function makeContext(variables, state, playerId, extraBindings = {}) {
  const variableIndex = new Map();
  for (const v of variables) {
    variableIndex.set(v.id, v);
  }
  return {
    playerId,
    variableIndex,
    state,
    bindings: extraBindings,
    impact: {
      affectedPlayerIds: new Set(),
      affectedGlobal: false,
    },
  };
}

describe("variable effect player targeting", () => {
  it("dec effect with player binding modifies bound player's variable", () => {
    const hp = makeVariable("hp");
    const state = makeState([hp]);
    const context = makeContext([hp], state, 1, { victim: 2 });

    const effect = {
      kind: "dec",
      target: { kind: "var", id: "hp", player: "victim" },
      amount: 3,
    };

    const result = applyEffect(state, effect, context);
    assert.equal(result.ok, true);
    assert.equal(state.variables.perPlayer[2].hp, 7);
    assert.equal(state.variables.perPlayer[1].hp, 10);
    assert.ok(context.impact.affectedPlayerIds.has(2));
  });

  it("inc effect with player: opponent modifies opponent's variable", () => {
    const gold = makeVariable("gold");
    const state = makeState([gold]);
    const context = makeContext([gold], state, 1);

    const effect = {
      kind: "inc",
      target: { kind: "var", id: "gold", player: "opponent" },
      amount: 5,
    };

    const result = applyEffect(state, effect, context);
    assert.equal(result.ok, true);
    assert.equal(state.variables.perPlayer[2].gold, 15);
    assert.equal(state.variables.perPlayer[1].gold, 10);
    assert.ok(context.impact.affectedPlayerIds.has(2));
  });

  it("effect with no player field uses active player (backward compat)", () => {
    const hp = makeVariable("hp");
    const state = makeState([hp]);
    const context = makeContext([hp], state, 1);

    const effect = {
      kind: "dec",
      target: { kind: "var", id: "hp" },
      amount: 2,
    };

    const result = applyEffect(state, effect, context);
    assert.equal(result.ok, true);
    assert.equal(state.variables.perPlayer[1].hp, 8);
    assert.equal(state.variables.perPlayer[2].hp, 10);
    assert.ok(context.impact.affectedPlayerIds.has(1));
  });

  it("effect with player: self uses active player", () => {
    const hp = makeVariable("hp");
    const state = makeState([hp]);
    const context = makeContext([hp], state, 1);

    const effect = {
      kind: "set",
      target: { kind: "var", id: "hp", player: "self" },
      value: 0,
    };

    const result = applyEffect(state, effect, context);
    assert.equal(result.ok, true);
    assert.equal(state.variables.perPlayer[1].hp, 0);
    assert.equal(state.variables.perPlayer[2].hp, 10);
  });

  it("effect with binding-based player records that player's ID in impact", () => {
    const hp = makeVariable("hp");
    const state = makeState([hp], [1, 2, 3]);
    const context = makeContext([hp], state, 1, { target: 3 });

    const effect = {
      kind: "dec",
      target: { kind: "var", id: "hp", player: "target" },
      amount: 1,
    };

    const result = applyEffect(state, effect, context);
    assert.equal(result.ok, true);
    assert.equal(state.variables.perPlayer[3].hp, 9);
    assert.ok(context.impact.affectedPlayerIds.has(3));
    assert.ok(!context.impact.affectedPlayerIds.has(1));
  });
});
