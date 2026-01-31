import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractTurnInfo } from "../../../src/tui/utils/extract-turn-info.js";

describe("extractTurnInfo", () => {
  it("returns defaults when gameState is null", () => {
    const result = extractTurnInfo(null);
    assert.deepStrictEqual(result, {
      turn: 0,
      round: 0,
      phase: "main",
      activePlayerId: null,
    });
  });

  it("returns defaults when gameState is undefined", () => {
    const result = extractTurnInfo(undefined);
    assert.deepStrictEqual(result, {
      turn: 0,
      round: 0,
      phase: "main",
      activePlayerId: null,
    });
  });

  it("returns defaults when gameState.turn is missing", () => {
    const result = extractTurnInfo({});
    assert.deepStrictEqual(result, {
      turn: 0,
      round: 0,
      phase: "main",
      activePlayerId: null,
    });
  });

  it("extracts values from a valid game state", () => {
    const gameState = {
      turn: {
        currentPlayer: 2,
        phase: "combat",
        turn: 5,
        round: 3,
        turnOrder: [1, 2],
      },
    };
    const result = extractTurnInfo(gameState);
    assert.deepStrictEqual(result, {
      turn: 5,
      round: 3,
      phase: "combat",
      activePlayerId: 2,
    });
  });

  it("handles missing fields within turn object", () => {
    const gameState = { turn: {} };
    const result = extractTurnInfo(gameState);
    assert.deepStrictEqual(result, {
      turn: 0,
      round: 0,
      phase: "main",
      activePlayerId: null,
    });
  });

  it("handles null phase correctly", () => {
    const gameState = {
      turn: { currentPlayer: 1, phase: null, turn: 1, round: 1, turnOrder: null },
    };
    const result = extractTurnInfo(gameState);
    assert.strictEqual(result.phase, "main");
  });
});
