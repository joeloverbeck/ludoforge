import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import {
  createEventStream,
  computeScoresAtState,
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

test("computeScoresAtState returns per-player scores from termination scoring", () => {
  const state = createInitialState(baseDefinition);
  state.variables.perPlayer[1].score = 5;
  state.variables.perPlayer[2].score = 2;

  const scores = computeScoresAtState(baseDefinition, state);
  assert.deepEqual(scores, { 1: 5, 2: 2 });
});

test("computeScoresAtState returns undefined when no scoring expression is configured", () => {
  const definition = {
    ...baseDefinition,
    termination: { ...baseDefinition.termination, scoring: undefined },
  };
  const state = createInitialState(definition);

  const scores = computeScoresAtState(definition, state);
  assert.equal(scores, undefined);
});

test("evaluateTermination returns draw on max-turns fallback", () => {
  const state = createInitialState(baseDefinition);

  const result = evaluateTermination(baseDefinition, state, { maxTurnsReached: true });
  assert.equal(result.terminated, true);
  assert.equal(result.reason, "max-turns");
  assert.deepEqual(result.outcomes, { 1: "draw", 2: "draw" });
});

test("evaluateTermination resolves meta.legalActionCount in conditions", () => {
  const definition = {
    ...baseDefinition,
    termination: {
      ...baseDefinition.termination,
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "==",
            left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
    },
  };
  const state = createInitialState(definition);

  const matched = evaluateTermination(definition, state, {
    activePlayerId: 1,
    meta: { legalActionCount: 0 },
  });
  assert.equal(matched.terminated, true);
  assert.deepEqual(matched.outcomes, { 1: "lose", 2: "win" });

  const missed = evaluateTermination(definition, state, {
    activePlayerId: 1,
    meta: { legalActionCount: 2 },
  });
  assert.equal(missed.terminated, false);
});

test("evaluateTermination derives meta.hasLegalActions from count", () => {
  const definition = {
    ...baseDefinition,
    termination: {
      ...baseDefinition.termination,
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "==",
            left: { kind: "ref", ref: { kind: "meta", id: "hasLegalActions" } },
            right: { kind: "value", value: true },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
  };
  const state = createInitialState(definition);

  const matched = evaluateTermination(definition, state, {
    activePlayerId: 2,
    meta: { legalActionCount: 1 },
  });
  assert.equal(matched.terminated, true);
  assert.deepEqual(matched.outcomes, { 1: "lose", 2: "win" });

  const missed = evaluateTermination(definition, state, {
    activePlayerId: 2,
    meta: { legalActionCount: 0 },
  });
  assert.equal(missed.terminated, false);
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
