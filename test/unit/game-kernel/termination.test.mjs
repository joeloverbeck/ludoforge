import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import {
  createEventStream,
  evaluateTermination,
  recordStateUpdate,
} from "../../../src/game-kernel/index.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 },
      { id: "flag", scope: "global", type: { kind: "int" }, initial: 0 },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin", phases: ["main"] },
  termination: {
    conditions: [
      {
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "flag" } },
          right: { kind: "value", value: 1 },
        },
        outcome: { type: "win", players: "active" },
      },
    ],
    scoring: {
      perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } },
    },
  },
  triggers: [],
};

test("evaluateTermination returns outcomes and scores for all agents", () => {
  const state = createInitialState(baseDefinition);
  state.variables.global.flag = 1;
  state.variables.perPlayer[1].score = 3;
  state.variables.perPlayer[2].score = 1;

  const result = evaluateTermination(baseDefinition, state, { activePlayerId: 2 });
  assert.equal(result.terminated, true);
  assert.equal(result.reason, "condition");
  assert.equal(result.conditionIndex, 0);
  assert.deepEqual(result.outcomes, { 1: "lose", 2: "win" });
  assert.deepEqual(result.scores, { 1: 3, 2: 1 });
});

test("evaluateTermination returns draw on max-turns fallback", () => {
  const state = createInitialState(baseDefinition);

  const result = evaluateTermination(baseDefinition, state, { maxTurnsReached: true });
  assert.equal(result.terminated, true);
  assert.equal(result.reason, "max-turns");
  assert.deepEqual(result.outcomes, { 1: "draw", 2: "draw" });
});

test("event stream ordering records state updates before termination", () => {
  const state = createInitialState(baseDefinition);
  state.variables.global.flag = 1;
  const events = createEventStream();

  recordStateUpdate(events, state, { phase: "main" });
  evaluateTermination(baseDefinition, state, { activePlayerId: 1, events });

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "state_update");
  assert.equal(events[1].type, "termination");
});
