import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../src/game-kernel/state.js";
import { listLegalActions, validateActionChoice } from "../../src/game-kernel/actions.js";

const baseDefinition = {
  version: "1.0",
  players: {
    count: 2,
    roles: ["north", "south"],
    teams: [["north"], ["south"]],
  },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      { id: "health", scope: "per_player", type: { kind: "int", min: 0, max: 10 }, initial: 9 },
      { id: "flag", scope: "global", type: { kind: "bool" }, initial: true },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [
    {
      id: "heal",
      actor: "player",
      preconditions: {
        kind: "cmp",
        op: "<",
        left: { kind: "ref", ref: { kind: "var", id: "health" } },
        right: { kind: "value", value: 10 },
      },
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 1 }],
      metadata: { phase: "main" },
    },
    {
      id: "role-action",
      actor: "role",
      actorRole: "north",
      effects: [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 1 }],
      metadata: { phase: "main" },
    },
    {
      id: "overheal",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 5 }],
      metadata: { phase: "main" },
    },
    {
      id: "set-score",
      actor: "player",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 20 }],
      metadata: { phase: "main" },
    },
    {
      id: "env-only",
      actor: "environment",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 1 }],
    },
  ],
  turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  termination: { conditions: [] },
};

test("listLegalActions respects phase and actor role", () => {
  const state = createInitialState(baseDefinition);

  const mainActions = listLegalActions(baseDefinition, state, { playerId: 1, phase: "main" }).map(
    (action) => action.id
  );
  assert.ok(mainActions.includes("heal"));
  assert.ok(mainActions.includes("role-action"));
  assert.ok(mainActions.includes("overheal"));
  assert.ok(mainActions.includes("set-score"));
  assert.ok(!mainActions.includes("env-only"));

  const southActions = listLegalActions(baseDefinition, state, { playerId: 2, phase: "main" }).map(
    (action) => action.id
  );
  assert.ok(!southActions.includes("role-action"));

  const setupActions = listLegalActions(baseDefinition, state, { playerId: 1, phase: "setup" });
  assert.equal(setupActions.length, 0);
});

test("validateActionChoice enforces bounds with reject or clamp", () => {
  const state = createInitialState(baseDefinition);

  const rejectResult = validateActionChoice(baseDefinition, state, "overheal", {
    playerId: 1,
    phase: "main",
  });
  assert.equal(rejectResult.ok, false);
  assert.equal(rejectResult.reason, "bounds");

  const clampResult = validateActionChoice(
    baseDefinition,
    state,
    "overheal",
    { playerId: 1, phase: "main" },
    { bounds: "clamp" }
  );
  assert.equal(clampResult.ok, true);
  assert.equal(clampResult.clamped, true);

  assert.equal(state.variables.perPlayer[1].health, 9);
});

test("validateActionChoice rejects illegal actions", () => {
  const state = createInitialState(baseDefinition);
  state.variables.perPlayer[1].health = 10;

  const preconditionResult = validateActionChoice(baseDefinition, state, "heal", {
    playerId: 1,
    phase: "main",
  });
  assert.equal(preconditionResult.ok, false);
  assert.equal(preconditionResult.reason, "illegal-action");

  const roleResult = validateActionChoice(baseDefinition, state, "role-action", {
    playerId: 2,
    phase: "main",
  });
  assert.equal(roleResult.ok, false);
  assert.equal(roleResult.reason, "illegal-action");
});
