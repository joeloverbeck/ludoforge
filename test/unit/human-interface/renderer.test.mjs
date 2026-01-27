import { test } from "node:test";
import assert from "node:assert/strict";
import { renderState } from "../../../src/human-interface/renderer.js";

const baseState = () => ({
  variables: {
    global: { score: 0 },
    perPlayer: {
      1: { health: 10 },
      2: { health: 10 },
    },
  },
  zones: {
    table: {
      id: "table",
      tokenType: "card",
      scope: "global",
      order: "unordered",
      visibility: "public",
      tokens: ["t1", "t2"],
    },
    deck: {
      id: "deck",
      tokenType: "card",
      scope: "global",
      order: "ordered",
      visibility: "private",
      tokens: ["t3", "t4"],
    },
    hand: {
      id: "hand",
      tokenType: "card",
      scope: "per_player",
      order: "unordered",
      visibility: "public",
      tokensByPlayer: {
        1: ["t5"],
        2: ["t6", "t7"],
      },
    },
    secret: {
      id: "secret",
      tokenType: "card",
      scope: "per_player",
      order: "unordered",
      visibility: "private",
      tokensByPlayer: {
        1: ["t8"],
        2: ["t9"],
      },
    },
  },
  turn: {
    currentPlayer: 1,
    phase: "main",
    turn: 3,
  },
});

test("renderer hides private zones when viewer is not the active player", () => {
  const output = renderState({ state: baseState(), viewerPlayerId: 2 });

  assert.ok(output.includes("table (global/public/unordered)"));
  assert.ok(output.includes("hand (per_player/public/unordered)"));
  assert.ok(!output.includes("deck (global/private/ordered)"));
  assert.ok(!output.includes("secret (per_player/private/unordered)"));
});

test("renderer shows private zones when viewer is the active player", () => {
  const output = renderState({ state: baseState(), viewerPlayerId: 1 });

  assert.ok(output.includes("deck (global/private/ordered)"));
  assert.ok(output.includes("secret (per_player/private/unordered)"));
  assert.ok(output.includes("Player 1: t8"));
  assert.ok(!output.includes("Player 2: t9"));
});

test("renderer collapses large zone output", () => {
  const state = baseState();
  state.zones.table.tokens = ["t1", "t2", "t3", "t4"];

  const output = renderState({
    state,
    viewerPlayerId: 1,
    options: { collapseLimit: 2 },
  });

  assert.ok(output.includes("t1, t2 (+2 more)"));
});

test("renderer highlights variable and token deltas", () => {
  const previousState = baseState();
  const state = baseState();

  state.variables.global.score = 5;
  state.variables.perPlayer[1].health = 8;
  state.zones.table.tokens = ["t2", "t3"];

  const output = renderState({
    state,
    previousState,
    viewerPlayerId: 1,
  });

  assert.ok(output.includes("Global Variables:"));
  assert.ok(output.includes("score: 0 -> 5"));
  assert.ok(output.includes("Player 1 Variables:"));
  assert.ok(output.includes("health: 10 -> 8"));
  assert.ok(output.includes("table: +t3 -t1"));
});
