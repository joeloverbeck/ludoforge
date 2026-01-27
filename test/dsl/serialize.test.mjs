import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeGameDefinition } from "../../src/dsl/serialize.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: { variables: [] },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

test("serializes deterministically for equivalent objects", () => {
  const reordered = {
    players: { count: 2 },
    version: "1.0",
    termination: { conditions: [] },
    turn: { scheduler: "round_robin" },
    actions: [],
    state: { variables: [] },
  };

  assert.equal(serializeGameDefinition(baseDefinition), serializeGameDefinition(reordered));
});

test("preserves array order", () => {
  const ordered = {
    ...baseDefinition,
    turn: { scheduler: "round_robin", phases: ["a", "b"] },
  };
  const swapped = {
    ...baseDefinition,
    turn: { scheduler: "round_robin", phases: ["b", "a"] },
  };

  assert.notEqual(serializeGameDefinition(ordered), serializeGameDefinition(swapped));
});

test("round-trips via JSON.parse", () => {
  const serialized = serializeGameDefinition(baseDefinition);
  const parsed = JSON.parse(serialized);

  assert.equal(serializeGameDefinition(parsed), serialized);
});
