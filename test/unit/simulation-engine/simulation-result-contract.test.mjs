import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/index.js";
import {
  createSimulationEngine,
  runRollout,
} from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

describe("simulation-result-contract", () => {
  const simulationReasons = new Set([
    "condition",
    "stalemate",
    "no-legal-actions",
    "max-turns",
    "max-steps",
    "loop-detected",
  ]);

  const rolloutReasons = new Set(simulationReasons);

  function assertPerPlayerOutcome(outcome) {
    assert.ok(outcome && typeof outcome === "object");
    assert.ok(!("reason" in outcome));
    assert.ok(!("terminated" in outcome));
    assert.ok(outcome.outcomes && typeof outcome.outcomes === "object");
    for (const [playerId, value] of Object.entries(outcome.outcomes)) {
      assert.ok(Number.isInteger(Number(playerId)));
      assert.ok(["win", "lose", "draw"].includes(value));
    }
  }

  function assertSimulationContract(result, { terminationReason, terminated }) {
    assert.ok(simulationReasons.has(result.terminationReason));
    assert.equal(result.terminationReason, terminationReason);
    assert.equal(result.terminated, terminated);
    assertPerPlayerOutcome(result.outcome);
  }

  function assertRolloutContract(result, { terminationReason, terminated }) {
    assert.ok(rolloutReasons.has(result.terminationReason));
    assert.equal(result.terminationReason, terminationReason);
    assert.equal(result.terminated, terminated);
    assertPerPlayerOutcome(result.outcome);
  }

  describe("SimulationResult contract", () => {
    it("holds across termination variants", () => {
      {
        const definition = createBaseDefinition();
        definition.actions = [createIncrementAction()];
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
        assertSimulationContract(result, { terminationReason: "condition", terminated: true });
      }

      {
        const definition = createBaseDefinition();
        definition.actions = [];
        definition.termination.conditions = [];

        const engine = createSimulationEngine({
          definition,
          agents: [createFirstActionAgent()],
        });
        const result = engine.run();
        assertSimulationContract(result, { terminationReason: "stalemate", terminated: true });
      }

      {
        const definition = createBaseDefinition();
        definition.actions = [];
        definition.termination.conditions = [];
        definition.turn.noLegalActions = {
          policy: "terminate",
          defaultOutcome: { type: "win", players: "active" },
        };

        const engine = createSimulationEngine({
          definition,
          agents: [createFirstActionAgent()],
        });
        const result = engine.run();
        assertSimulationContract(result, { terminationReason: "no-legal-actions", terminated: true });
      }

      {
        const definition = createBaseDefinition();
        definition.actions = [createIncrementAction()];
        definition.termination.conditions = [];

        const engine = createSimulationEngine({
          definition,
          agents: [createFirstActionAgent()],
          maxTurns: 1,
        });
        const result = engine.run();
        assertSimulationContract(result, { terminationReason: "max-turns", terminated: false });
      }

      {
        const definition = createBaseDefinition();
        definition.actions = [createIncrementAction()];
        definition.termination.conditions = [];

        const engine = createSimulationEngine({
          definition,
          agents: [createFirstActionAgent()],
          maxSteps: 1,
        });
        const result = engine.run();
        assertSimulationContract(result, { terminationReason: "max-steps", terminated: false });
      }

      {
        const definition = createBaseDefinition();
        definition.actions = [createNoopAction()];
        definition.termination.conditions = [];

        const engine = createSimulationEngine({
          definition,
          agents: [createFirstActionAgent()],
          loopDetection: { maxRepeatedStates: 1 },
        });
        const result = engine.run();
        assertSimulationContract(result, { terminationReason: "loop-detected", terminated: false });
      }
    });
  });

  describe("RolloutResult contract", () => {
    it("holds for max-steps cutoff", () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const state = createInitialState(definition);
      const result = runRollout({
        definition,
        state,
        agent: { kind: "greedy" },
        maxSteps: 1,
      });

      assertRolloutContract(result, { terminationReason: "max-steps", terminated: false });
    });
  });
});
