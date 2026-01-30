import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlayerOrder,
  shufflePlayers,
  resolveSimultaneousOrder,
} from "../../../src/simulation-engine/simultaneous-order.js";

describe("buildPlayerOrder", () => {
  it("returns [1] for a 1-player game", () => {
    assert.deepStrictEqual(buildPlayerOrder({ players: { count: 1 } }), [1]);
  });

  it("returns [1, 2, 3] for a 3-player game", () => {
    assert.deepStrictEqual(buildPlayerOrder({ players: { count: 3 } }), [1, 2, 3]);
  });

  it("returns empty array for 0 players", () => {
    assert.deepStrictEqual(buildPlayerOrder({ players: { count: 0 } }), []);
  });
});

describe("shufflePlayers", () => {
  it("returns a new array of the same length", () => {
    const input = [1, 2, 3, 4];
    const result = shufflePlayers(input, { nextInt: (n) => n - 1 });
    assert.equal(result.length, input.length);
    assert.notStrictEqual(result, input);
  });

  it("produces deterministic output with a mock RNG", () => {
    // RNG always returns 0 → every swap puts element at index 0
    const result = shufflePlayers([1, 2, 3], { nextInt: () => 0 });
    assert.deepStrictEqual(result, [2, 3, 1]);
  });

  it("does not mutate the original array", () => {
    const input = [1, 2, 3];
    shufflePlayers(input, { nextInt: () => 0 });
    assert.deepStrictEqual(input, [1, 2, 3]);
  });
});

describe("resolveSimultaneousOrder", () => {
  it("defaults to by_player_id order", () => {
    const def = { players: { count: 3 } };
    assert.deepStrictEqual(resolveSimultaneousOrder(def), [1, 2, 3]);
  });

  it("returns by_player_id when explicitly configured", () => {
    const def = {
      players: { count: 2 },
      turn: { resolution: { order: "by_player_id" } },
    };
    assert.deepStrictEqual(resolveSimultaneousOrder(def), [1, 2]);
  });

  it("shuffles when order is random", () => {
    const def = {
      players: { count: 3 },
      turn: { resolution: { order: "random" } },
    };
    const rng = { nextInt: () => 0 };
    const result = resolveSimultaneousOrder(def, rng);
    assert.equal(result.length, 3);
    // With nextInt always 0, shuffle produces [2, 3, 1]
    assert.deepStrictEqual(result, [2, 3, 1]);
  });
});
