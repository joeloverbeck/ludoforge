import { test } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

test("runSimulation logs steps and terminates on condition", () => {
  const definition = createBaseDefinition();
  definition.actions = [createIncrementAction()];
  definition.termination.conditions = [
    {
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "counter" } },
        right: { kind: "value", value: 2 },
      },
      outcome: { type: "win", players: "active" },
    },
  ];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  const result = engine.run();

  assert.equal(result.terminated, true);
  assert.ok(!("reason" in result.outcome));
  assert.equal(result.trajectory.steps.length, 2);
  assert.equal(result.trajectory.steps[0].actionId, "tick");
  assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, []);
  assert.equal(result.trajectory.steps[0].affectedGlobal, true);
  assert.equal(result.trajectory.events.at(-1)?.type, "termination");
});

test("max-turn cap ends the simulation with a max-turns reason", () => {
  const definition = createBaseDefinition();
  definition.actions = [createIncrementAction()];
  definition.termination.conditions = [];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
    maxTurns: 1,
  });

  const result = engine.run();

  assert.equal(result.terminationReason, "max-turns");
  assert.equal(result.terminated, false);
  assert.ok(!("reason" in result.outcome));
  assert.equal(result.trajectory.steps.length, 1);
});

test("loop detection stops repeated states with a draw outcome", () => {
  const definition = createBaseDefinition();
  definition.actions = [createNoopAction()];
  definition.termination.conditions = [];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
    loopDetection: { maxRepeatedStates: 1 },
  });

  const result = engine.run();

  assert.equal(result.terminationReason, "loop-detected");
  assert.equal(result.terminated, false);
  assert.equal(result.trajectory.steps.length, 1);
});

test("stalemate ends when no legal actions exist", () => {
  const definition = createBaseDefinition();
  definition.actions = [];
  definition.termination.conditions = [];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  const result = engine.run();

  assert.equal(result.terminationReason, "stalemate");
  assert.equal(result.terminated, true);
  assert.equal(result.trajectory.steps.length, 1);
  assert.equal(result.trajectory.steps[0].legalActionCount, 0);
});

test("no-legal-actions terminate policy uses default outcome", () => {
  const definition = createBaseDefinition();
  definition.actions = [];
  definition.termination.conditions = [];
  definition.turn.noLegalActions = {
    policy: "terminate",
    defaultOutcome: { type: "win", players: "active" },
    reason: "policy-reason",
  };

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  const result = engine.run();

  assert.equal(result.terminationReason, "no-legal-actions");
  assert.equal(result.terminationDetail, "policy-reason");
  assert.equal(result.terminated, true);
  assert.ok(!("reason" in result.outcome));
  assert.deepEqual(result.outcome.outcomes, { 1: "win" });
  assert.equal(result.trajectory.steps.length, 1);
  assert.equal(result.trajectory.steps[0].legalActionCount, 0);
});

test("no-legal-actions pass policy records a pass step and advances", () => {
  const definition = createBaseDefinition();
  definition.actions = [];
  definition.termination.conditions = [];
  definition.turn.noLegalActions = { policy: "pass" };

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
    maxTurns: 1,
  });

  const result = engine.run();

  assert.equal(result.terminationReason, "max-turns");
  assert.equal(result.terminated, false);
  assert.ok(!("reason" in result.outcome));
  assert.equal(result.trajectory.steps.length, 1);
  assert.equal(result.trajectory.steps[0].actionId, null);
  assert.equal(result.trajectory.steps[0].legalActionCount, 0);
  assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, []);
  assert.equal(result.trajectory.steps[0].affectedGlobal, false);
});

test("no-legal-actions error policy throws", () => {
  const definition = createBaseDefinition();
  definition.actions = [];
  definition.termination.conditions = [];
  definition.turn.noLegalActions = { policy: "error", reason: "no-legal-actions" };

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  assert.throws(
    () => engine.run(),
    (err) => err instanceof Error && err.message.includes("no-legal-actions")
  );
});

test("step instrumentation captures per-player and trigger effects", () => {
  const definition = createBaseDefinition();
  definition.players.count = 2;
  definition.state.variables = [
    { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
    { id: "health", scope: "per_player", type: { kind: "int" }, initial: 0 },
  ];
  definition.actions = [
    {
      id: "poke",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
    },
  ];
  definition.triggers = [
    {
      event: "after_action",
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 1 }],
    },
  ];
  definition.termination.conditions = [
    {
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "counter" } },
        right: { kind: "value", value: 1 },
      },
      outcome: { type: "win", players: "active" },
    },
  ];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  const result = engine.run();
  assert.equal(result.trajectory.steps.length, 1);
  assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, [1]);
  assert.equal(result.trajectory.steps[0].affectedGlobal, true);
});

test("step instrumentation attributes per-player action effects to the active player", () => {
  const definition = createBaseDefinition();
  definition.players.count = 2;
  definition.state.variables = [
    { id: "health", scope: "per_player", type: { kind: "int" }, initial: 0 },
  ];
  definition.actions = [
    {
      id: "heal",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 1 }],
    },
  ];
  definition.termination.conditions = [
    {
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "health" } },
        right: { kind: "value", value: 1 },
      },
      outcome: { type: "win", players: "active" },
    },
  ];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });

  const result = engine.run();
  assert.equal(result.trajectory.steps.length, 1);
  assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, [1]);
  assert.equal(result.trajectory.steps[0].affectedGlobal, false);
});
