import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { advanceTurnPhase } from "../../../src/game-kernel/scheduler.js";
import { applyTokenMove, applyTokenSpawn } from "../../../src/game-kernel/token-effects.js";

function makeTokenHolderDef(overrides = {}) {
  return {
    version: "1.0",
    players: { count: overrides.playerCount ?? 2 },
    state: {
      variables: [],
      tokenTypes: [{ id: "baton", attributes: [] }],
      zones: [
        {
          id: "hand",
          tokenType: "baton",
          scope: "per_player",
          order: "unordered",
          visibility: "public",
        },
        {
          id: "table",
          tokenType: "baton",
          scope: "global",
          order: "unordered",
          visibility: "public",
        },
      ],
    },
    actions: [],
    turn: {
      scheduler: "token_holder",
      tokenType: "baton",
      zone: "hand",
      phases: overrides.phases ?? ["main"],
    },
    termination: { conditions: [], maxTurns: 50 },
    triggers: [],
  };
}

function spawnToken(definition, state, playerId, zoneId = "hand") {
  const spawn = applyTokenSpawn(
    state,
    { kind: "spawn", target: { kind: "token", id: "baton" }, toZone: zoneId },
    { definition, playerId }
  );
  assert.equal(spawn.ok, true);
  return spawn.appliedEffect.tokenId;
}

describe("token_holder scheduler", () => {
  it("selects the player who holds the token", () => {
    const def = makeTokenHolderDef();
    const state = createInitialState(def);

    spawnToken(def, state, 2);

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 2);
  });

  it("switches to the new holder after token transfer", () => {
    const def = makeTokenHolderDef();
    const state = createInitialState(def);

    const tokenId = spawnToken(def, state, 1);
    const move = applyTokenMove(
      state,
      { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand", toPlayer: "opponent" },
      { definition: def, playerId: 1 }
    );
    assert.equal(move.ok, true);

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 2);
  });

  it("returns an error when no player holds the token", () => {
    const def = makeTokenHolderDef();
    const state = createInitialState(def);

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "token-holder-not-found");
  });

  it("returns an error when the token is only in a global zone", () => {
    const def = makeTokenHolderDef();
    const state = createInitialState(def);

    spawnToken(def, state, undefined, "table");

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "token-holder-not-found");
  });

  it("breaks ties by lowest player ID when multiple holders exist", () => {
    const def = makeTokenHolderDef();
    const state = createInitialState(def);

    spawnToken(def, state, 2);
    spawnToken(def, state, 1);

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 1);
  });

  it("phase cycling works correctly within token_holder turns", () => {
    const def = makeTokenHolderDef({ phases: ["setup", "main"] });
    const state = createInitialState(def);

    spawnToken(def, state, 1);

    advanceTurnPhase(def, state);
    assert.equal(state.turn.phase, "main");
    assert.equal(state.turn.currentPlayer, 1);

    advanceTurnPhase(def, state);
    assert.equal(state.turn.phase, "setup");
    assert.equal(state.turn.currentPlayer, 1);
  });
});
