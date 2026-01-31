import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getVariableValue } from "../../../src/tui/utils/get-variable-value.js";

describe("getVariableValue", () => {
  it("returns undefined when gameState is null", () => {
    assert.strictEqual(getVariableValue(null, "hp", "global"), undefined);
  });

  it("returns undefined when gameState is undefined", () => {
    assert.strictEqual(getVariableValue(undefined, "hp", "global"), undefined);
  });

  it("returns undefined when variables is missing", () => {
    assert.strictEqual(getVariableValue({}, "hp", "global"), undefined);
  });

  it("reads a global variable", () => {
    const gameState = { variables: { global: { score: 42 }, perPlayer: {} } };
    assert.strictEqual(getVariableValue(gameState, "score", "global"), 42);
  });

  it("returns undefined for a missing global variable", () => {
    const gameState = { variables: { global: {}, perPlayer: {} } };
    assert.strictEqual(getVariableValue(gameState, "nope", "global"), undefined);
  });

  it("reads a per-player variable", () => {
    const gameState = {
      variables: { global: {}, perPlayer: { 1: { hp: 10 }, 2: { hp: 8 } } },
    };
    assert.strictEqual(getVariableValue(gameState, "hp", 1), 10);
    assert.strictEqual(getVariableValue(gameState, "hp", 2), 8);
  });

  it("returns undefined for a missing per-player variable", () => {
    const gameState = {
      variables: { global: {}, perPlayer: { 1: {} } },
    };
    assert.strictEqual(getVariableValue(gameState, "nope", 1), undefined);
  });

  it("returns undefined when player id does not exist", () => {
    const gameState = {
      variables: { global: {}, perPlayer: { 1: { hp: 5 } } },
    };
    assert.strictEqual(getVariableValue(gameState, "hp", 99), undefined);
  });

  it("preserves falsy-but-valid values: 0", () => {
    const gameState = { variables: { global: { count: 0 }, perPlayer: {} } };
    assert.strictEqual(getVariableValue(gameState, "count", "global"), 0);
  });

  it("preserves falsy-but-valid values: false", () => {
    const gameState = { variables: { global: { flag: false }, perPlayer: {} } };
    assert.strictEqual(getVariableValue(gameState, "flag", "global"), false);
  });

  it("preserves falsy-but-valid values: empty string", () => {
    const gameState = { variables: { global: { name: "" }, perPlayer: {} } };
    assert.strictEqual(getVariableValue(gameState, "name", "global"), "");
  });
});
