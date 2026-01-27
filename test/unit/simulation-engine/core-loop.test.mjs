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

  assert.equal(result.outcome.terminated, true);
  assert.equal(result.outcome.reason, "condition");
  assert.equal(result.trajectory.steps.length, 2);
  assert.equal(result.trajectory.steps[0].actionId, "tick");
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
  assert.equal(result.outcome.terminated, true);
  assert.equal(result.outcome.reason, "max-turns");
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
  assert.equal(result.outcome.terminated, true);
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
  assert.equal(result.outcome.terminated, true);
  assert.equal(result.trajectory.steps.length, 1);
  assert.equal(result.trajectory.steps[0].legalActionCount, 0);
});
