import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { advanceRandomDraw } from "../../../src/game-kernel/scheduler-strategies.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

const baseDef = {
  players: { count: 3 },
  turn: { scheduler: "random_draw", phases: ["main"] },
};

const baseState = {
  turn: { currentPlayer: 1, phase: "main", turn: 1, round: 1, _actedThisRound: new Set() },
  variables: { global: {}, perPlayer: {} },
  tokens: {},
  zones: {},
};

describe("advanceRandomDraw rng interface", () => {
  it("works with an object exposing .next()", () => {
    const rng = { next: () => 0.5 };
    const state = structuredClone(baseState);
    state.turn._actedThisRound = new Set();

    const result = advanceRandomDraw(baseDef, state, rng);
    assert.notEqual(result.ok, false);
    assert.equal(typeof result.nextPlayer, "number");
    assert.ok(result.nextPlayer >= 1 && result.nextPlayer <= 3);
  });

  it("works with createSeededRng and produces deterministic output", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const state1 = structuredClone(baseState);
    state1.turn._actedThisRound = new Set();
    const state2 = structuredClone(baseState);
    state2.turn._actedThisRound = new Set();

    const result1 = advanceRandomDraw(baseDef, state1, rng1);
    const result2 = advanceRandomDraw(baseDef, state2, rng2);

    assert.equal(result1.nextPlayer, result2.nextPlayer);
  });

  it("returns error when rng is not provided", () => {
    const state = structuredClone(baseState);
    const result = advanceRandomDraw(baseDef, state, undefined);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "random-draw-missing-rng");
  });
});
