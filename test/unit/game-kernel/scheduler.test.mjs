import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { advanceTurnPhase } from "../../../src/game-kernel/scheduler.js";
import { applyTriggers } from "../../../src/game-kernel/triggers.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
  },
  actions: [],
  turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  termination: { conditions: [] },
  triggers: [],
};

test("advanceTurnPhase follows phase order and round-robin player turns", () => {
  const state = createInitialState(baseDefinition);

  const first = advanceTurnPhase(baseDefinition, state);
  assert.equal(first.ok, true);
  assert.equal(state.turn.phase, "main");
  assert.equal(state.turn.currentPlayer, 1);
  assert.equal(state.turn.turn, 1);

  const second = advanceTurnPhase(baseDefinition, state);
  assert.equal(second.ok, true);
  assert.equal(state.turn.phase, "setup");
  assert.equal(state.turn.currentPlayer, 2);
  assert.equal(state.turn.turn, 2);
});

test("phase triggers apply around transitions", () => {
  const definition = {
    ...baseDefinition,
    triggers: [
      {
        event: "end_phase",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
      {
        event: "start_phase",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
    ],
  };
  const state = createInitialState(definition);

  const result = advanceTurnPhase(definition, state);
  assert.equal(result.ok, true);
  assert.equal(state.variables.global.counter, 2);
});

test("trigger loop detection fires when triggers re-run without state change", () => {
  const definition = {
    ...baseDefinition,
    state: {
      variables: [{ id: "flag", scope: "global", type: { kind: "int" }, initial: 1 }],
    },
    triggers: [
      {
        event: "start_phase",
        condition: {
          kind: "cmp",
          op: "==",
          left: { kind: "ref", ref: { kind: "var", id: "flag" } },
          right: { kind: "value", value: 1 },
        },
        effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: 1 }],
      },
    ],
  };
  const state = createInitialState(definition);

  const result = advanceTurnPhase(definition, state);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "trigger-loop");
});

test("max-turn failsafe blocks advancing beyond the configured limit", () => {
  const definition = {
    ...baseDefinition,
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: { conditions: [], maxTurns: 1 },
  };
  const state = createInitialState(definition);

  const result = advanceTurnPhase(definition, state);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "max-turns");
  assert.equal(state.turn.turn, 1);
  assert.equal(state.turn.currentPlayer, 1);
  assert.equal(state.turn.phase, "main");
});

test("state loop detection halts repeated states with a failsafe flag", () => {
  const definition = {
    ...baseDefinition,
    turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  };
  const state = createInitialState(definition);

  advanceTurnPhase(definition, state);
  advanceTurnPhase(definition, state);
  advanceTurnPhase(definition, state);
  const result = advanceTurnPhase(definition, state);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "state-loop");
  assert.equal(result.failsafe?.type, "draw");
});

test("max step guard caps auto-effects per scheduler step", () => {
  const definition = {
    ...baseDefinition,
    triggers: [
      {
        event: "start_phase",
        effects: [
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
        ],
      },
    ],
  };
  const state = createInitialState(definition);

  const result = advanceTurnPhase(definition, state, { maxStepsPerTurn: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "max-steps");
  assert.equal(state.variables.global.counter, 1);
});

test("trigger recursion guard blocks re-entry when depth is exceeded", () => {
  const definition = {
    ...baseDefinition,
    triggers: [
      {
        event: "start_phase",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
    ],
  };
  const state = createInitialState(definition);
  const guard = { depth: 1, maxDepth: 1, steps: 0, maxSteps: 10 };

  const result = applyTriggers(definition, state, "start_phase", {
    playerId: 1,
    phase: "setup",
    guard,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "trigger-recursion");
});
