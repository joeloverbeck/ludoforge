import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTokenColorMap,
  playerColor,
  TOKEN_COLORS,
  PLAYER_COLORS,
} from "../../../src/tui/utils/color-scheme.js";

describe("buildTokenColorMap", () => {
  it("assigns first color to first token type", () => {
    const map = buildTokenColorMap([{ id: "warrior" }]);
    assert.equal(map.warrior, "cyan");
  });

  it("assigns distinct colors to multiple token types", () => {
    const types = [{ id: "warrior" }, { id: "archer" }, { id: "mage" }];
    const map = buildTokenColorMap(types);
    assert.equal(map.warrior, "cyan");
    assert.equal(map.archer, "yellow");
    assert.equal(map.mage, "magenta");
  });

  it("cycles colors when more types than colors", () => {
    const types = TOKEN_COLORS.map((_, i) => ({ id: `t${i}` }));
    types.push({ id: "extra" });
    const map = buildTokenColorMap(types);
    assert.equal(map.extra, TOKEN_COLORS[0]);
  });

  it("returns empty map for empty token types", () => {
    const map = buildTokenColorMap([]);
    assert.deepStrictEqual(map, {});
  });
});

describe("playerColor", () => {
  it("returns green for player index 0", () => {
    assert.equal(playerColor(0), "green");
  });

  it("returns red for player index 1", () => {
    assert.equal(playerColor(1), "red");
  });

  it("cycles for indices beyond player color count", () => {
    assert.equal(playerColor(PLAYER_COLORS.length), PLAYER_COLORS[0]);
  });

  it("returns distinct colors for first 6 players", () => {
    const colors = new Set();
    for (let i = 0; i < PLAYER_COLORS.length; i++) {
      colors.add(playerColor(i));
    }
    assert.equal(colors.size, PLAYER_COLORS.length);
  });
});

describe("TOKEN_COLORS", () => {
  it("has 7 entries", () => {
    assert.equal(TOKEN_COLORS.length, 7);
  });

  it("starts with cyan", () => {
    assert.equal(TOKEN_COLORS[0], "cyan");
  });
});

describe("PLAYER_COLORS", () => {
  it("has 6 entries", () => {
    assert.equal(PLAYER_COLORS.length, 6);
  });

  it("starts with green", () => {
    assert.equal(PLAYER_COLORS[0], "green");
  });
});
