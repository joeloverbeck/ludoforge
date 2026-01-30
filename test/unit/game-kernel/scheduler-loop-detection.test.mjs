import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  snapshotLoopState,
  getLoopHistory,
  seedLoopHistory,
  recordLoopState,
} from "../../../src/game-kernel/scheduler-loop-detection.js";

function makeState(overrides = {}) {
  return {
    variables: { global: {}, perPlayer: {} },
    tokens: {},
    zones: {},
    turn: {
      currentPlayer: 1,
      phase: null,
      turn: 1,
      round: 1,
      turnOrder: null,
      ...overrides,
    },
  };
}

describe("snapshotLoopState", () => {
  it("produces a deterministic JSON string", () => {
    const state = makeState();
    const snap1 = snapshotLoopState(state);
    const snap2 = snapshotLoopState(state);
    assert.strictEqual(snap1, snap2);
  });

  it("includes turn fields in snapshot", () => {
    const state = makeState({ currentPlayer: 2, phase: "draw", turn: 3, round: 2 });
    const parsed = JSON.parse(snapshotLoopState(state));
    assert.strictEqual(parsed.turn.currentPlayer, 2);
    assert.strictEqual(parsed.turn.phase, "draw");
    assert.strictEqual(parsed.turn.turn, 3);
    assert.strictEqual(parsed.turn.round, 2);
  });
});

describe("getLoopHistory", () => {
  it("returns empty history for new state", () => {
    const state = makeState();
    const history = getLoopHistory(state);
    assert.strictEqual(history.snapshots.size, 0);
    assert.strictEqual(history.order.length, 0);
  });

  it("returns same history object on repeated calls", () => {
    const state = makeState();
    const h1 = getLoopHistory(state);
    const h2 = getLoopHistory(state);
    assert.strictEqual(h1, h2);
  });
});

describe("seedLoopHistory", () => {
  it("seeds initial snapshot", () => {
    const state = makeState();
    seedLoopHistory(state, 256);
    const history = getLoopHistory(state);
    assert.strictEqual(history.snapshots.size, 1);
    assert.strictEqual(history.order.length, 1);
  });

  it("does not re-seed if already seeded", () => {
    const state = makeState();
    seedLoopHistory(state, 256);
    seedLoopHistory(state, 256);
    const history = getLoopHistory(state);
    assert.strictEqual(history.order.length, 1);
  });
});

describe("recordLoopState", () => {
  it("returns looped=false for new state", () => {
    const state = makeState();
    const result = recordLoopState(state, 256);
    assert.strictEqual(result.looped, false);
  });

  it("detects duplicate state as looped=true", () => {
    const state = makeState();
    recordLoopState(state, 256);
    const result = recordLoopState(state, 256);
    assert.strictEqual(result.looped, true);
  });

  it("evicts old entries when exceeding limit", () => {
    const state = makeState();
    seedLoopHistory(state, 2);
    // Mutate turn to produce distinct snapshots
    state.turn = { ...state.turn, turn: 2 };
    recordLoopState(state, 2);
    state.turn = { ...state.turn, turn: 3 };
    recordLoopState(state, 2);
    // Original snapshot (turn=1) should have been evicted
    state.turn = { ...state.turn, turn: 1 };
    const result = recordLoopState(state, 2);
    assert.strictEqual(result.looped, false);
  });
});
