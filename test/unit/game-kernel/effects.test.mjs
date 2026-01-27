import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      { id: "health", scope: "per_player", type: { kind: "int", min: 0, max: 10 }, initial: 9 },
      { id: "flag", scope: "global", type: { kind: "bool" }, initial: true },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

test("applyEffect enforces bounds when requested", () => {
  const state = createInitialState(baseDefinition);
  const variableIndex = buildVariableIndex(baseDefinition);

  const rejectResult = applyEffect(
    state,
    { kind: "inc", target: { kind: "var", id: "health" }, amount: 5 },
    { state, playerId: 1, variableIndex },
    { boundsMode: "reject" }
  );
  assert.equal(rejectResult.ok, false);
  assert.equal(rejectResult.reason, "bounds");
  assert.equal(state.variables.perPlayer[1].health, 9);

  const clampResult = applyEffect(
    state,
    { kind: "inc", target: { kind: "var", id: "health" }, amount: 5 },
    { state, playerId: 1, variableIndex },
    { boundsMode: "clamp" }
  );
  assert.equal(clampResult.ok, true);
  assert.equal(clampResult.clamped, true);
  assert.equal(state.variables.perPlayer[1].health, 10);
});

test("applyEffect treats non-variable effects as no-ops", () => {
  const state = createInitialState(baseDefinition);
  const variableIndex = buildVariableIndex(baseDefinition);

  const result = applyEffect(
    state,
    { kind: "spawn", target: { kind: "token", id: "t1" }, toZone: "board" },
    { state, playerId: 1, variableIndex }
  );
  assert.equal(result.ok, true);
  assert.equal(state.variables.global.score, 5);
  assert.deepEqual(state.tokens, {});
});
