import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parsePlayArgs } from "../../../src/tui/parse-play-args.js";

describe("parsePlayArgs", () => {
  it("returns defaults for empty argv", () => {
    const result = parsePlayArgs(["node", "cli"]);
    assert.equal(result.gameFile, null);
    assert.equal(result.watch, false);
    assert.equal(result.speed, 500);
    assert.equal(result.seed, undefined);
    assert.deepStrictEqual(result.players, []);
    assert.equal(result.help, false);
    assert.equal(result._hasArgs, false);
  });

  it("parses positional game file", () => {
    const result = parsePlayArgs(["node", "cli", "my-game.json"]);
    assert.equal(result.gameFile, "my-game.json");
    assert.equal(result._hasArgs, true);
  });

  it("parses --help and -h", () => {
    assert.equal(parsePlayArgs(["node", "cli", "--help"]).help, true);
    assert.equal(parsePlayArgs(["node", "cli", "-h"]).help, true);
  });

  it("parses --watch flag", () => {
    const result = parsePlayArgs(["node", "cli", "g.json", "--watch"]);
    assert.equal(result.watch, true);
    assert.equal(result.gameFile, "g.json");
  });

  it("parses --speed with value", () => {
    const result = parsePlayArgs(["node", "cli", "g.json", "--speed", "200"]);
    assert.equal(result.speed, 200);
  });

  it("parses --seed with value", () => {
    const result = parsePlayArgs(["node", "cli", "g.json", "--seed", "42"]);
    assert.equal(result.seed, 42);
  });

  it("parses --player assignments", () => {
    const result = parsePlayArgs([
      "node", "cli", "g.json",
      "--player", "1=human",
      "--player", "2=random",
    ]);
    assert.deepStrictEqual(result.players, [
      { slot: 1, type: "human" },
      { slot: 2, type: "random" },
    ]);
  });

  it("parses --player with greedy type", () => {
    const result = parsePlayArgs(["node", "cli", "g.json", "--player", "3=greedy"]);
    assert.deepStrictEqual(result.players, [{ slot: 3, type: "greedy" }]);
  });

  it("parses all flags combined", () => {
    const result = parsePlayArgs([
      "node", "cli", "g.json",
      "--watch", "--speed", "100", "--seed", "7",
      "--player", "1=human",
    ]);
    assert.equal(result.gameFile, "g.json");
    assert.equal(result.watch, true);
    assert.equal(result.speed, 100);
    assert.equal(result.seed, 7);
    assert.deepStrictEqual(result.players, [{ slot: 1, type: "human" }]);
  });

  it("throws for unknown flag", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "--bogus"]),
      { message: 'unknown flag "--bogus"' },
    );
  });

  it("throws for unexpected extra positional argument", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "a.json", "b.json"]),
      { message: 'unexpected argument "b.json"' },
    );
  });

  it("throws for --speed without value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--speed"]),
      { message: "--speed requires a numeric value" },
    );
  });

  it("throws for --speed with negative value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--speed", "-1"]),
      { message: "--speed requires a numeric value" },
    );
  });

  it("throws for --speed with non-numeric value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--speed", "abc"]),
      { message: "--speed must be a non-negative number" },
    );
  });

  it("throws for --seed without value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--seed"]),
      { message: "--seed requires a numeric value" },
    );
  });

  it("throws for --seed with non-finite value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--seed", "NaN"]),
      { message: "--seed must be a finite number" },
    );
  });

  it("throws for --player without value", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--player"]),
      { message: "--player requires a value like 1=human or 2=random" },
    );
  });

  it("throws for --player with invalid format", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--player", "bad"]),
      (err) => err.message.includes('invalid --player format "bad"'),
    );
  });

  it("throws for --player with unknown type", () => {
    assert.throws(
      () => parsePlayArgs(["node", "cli", "g.json", "--player", "1=wizard"]),
      (err) => err.message.includes('invalid --player format "1=wizard"'),
    );
  });

  it("handles non-array argv gracefully", () => {
    const result = parsePlayArgs(null);
    assert.equal(result._hasArgs, false);
    assert.equal(result.gameFile, null);
  });
});
