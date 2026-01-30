import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePhases,
  resolvePhaseAdvance,
  advanceRoundTracking,
} from "../../../src/game-kernel/scheduler-phase-cycling.js";

describe("resolvePhases", () => {
  it("returns [null] when no phases defined", () => {
    assert.deepStrictEqual(resolvePhases({ turn: {} }), [null]);
  });

  it("returns [null] when phases is empty array", () => {
    assert.deepStrictEqual(resolvePhases({ turn: { phases: [] } }), [null]);
  });

  it("returns phases when defined", () => {
    const phases = ["draw", "play", "discard"];
    assert.deepStrictEqual(
      resolvePhases({ turn: { phases } }),
      ["draw", "play", "discard"]
    );
  });
});

describe("resolvePhaseAdvance", () => {
  it("returns cycling=true with next phase when not at last phase", () => {
    const definition = { turn: { phases: ["draw", "play", "discard"] } };
    const state = {
      turn: {
        phase: "draw",
        currentPlayer: 2,
        turn: 5,
        round: 3,
        _actedThisRound: new Set([1]),
      },
    };
    const result = resolvePhaseAdvance(definition, state);
    assert.strictEqual(result.cycling, true);
    assert.strictEqual(result.result.nextPhase, "play");
    assert.strictEqual(result.result.nextPlayer, 2);
    assert.strictEqual(result.result.nextTurn, 5);
    assert.strictEqual(result.result.nextRound, 3);
  });

  it("returns cycling=false with phases when at last phase", () => {
    const definition = { turn: { phases: ["draw", "play"] } };
    const state = {
      turn: { phase: "play", currentPlayer: 1, turn: 1, round: 1 },
    };
    const result = resolvePhaseAdvance(definition, state);
    assert.strictEqual(result.cycling, false);
    assert.deepStrictEqual(result.phases, ["draw", "play"]);
  });

  it("returns cycling=false when single null phase", () => {
    const definition = { turn: {} };
    const state = {
      turn: { phase: null, currentPlayer: 1, turn: 1, round: 1 },
    };
    const result = resolvePhaseAdvance(definition, state);
    assert.strictEqual(result.cycling, false);
    assert.deepStrictEqual(result.phases, [null]);
  });

  it("treats unknown current phase as index 0", () => {
    const definition = { turn: { phases: ["a", "b", "c"] } };
    const state = {
      turn: { phase: "unknown", currentPlayer: 1, turn: 1, round: 1 },
    };
    const result = resolvePhaseAdvance(definition, state);
    assert.strictEqual(result.cycling, true);
    assert.strictEqual(result.result.nextPhase, "b");
  });
});

describe("advanceRoundTracking", () => {
  it("advances round when all players have acted", () => {
    const state = {
      turn: {
        currentPlayer: 2,
        round: 3,
        _actedThisRound: new Set([1]),
      },
    };
    const result = advanceRoundTracking(state, 2);
    assert.strictEqual(result.nextRound, 4);
    assert.strictEqual(result.nextActed.size, 0);
  });

  it("stays in same round when not all players have acted", () => {
    const state = {
      turn: {
        currentPlayer: 1,
        round: 3,
        _actedThisRound: new Set(),
      },
    };
    const result = advanceRoundTracking(state, 3);
    assert.strictEqual(result.nextRound, 3);
    assert.ok(result.nextActed.has(1));
  });

  it("initializes acted set when undefined", () => {
    const state = {
      turn: { currentPlayer: 1, round: 1 },
    };
    const result = advanceRoundTracking(state, 4);
    assert.strictEqual(result.nextRound, 1);
    assert.ok(result.nextActed.has(1));
    assert.strictEqual(result.nextActed.size, 1);
  });
});
