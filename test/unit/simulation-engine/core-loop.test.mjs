import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

describe("core-loop", () => {
  describe("termination conditions", () => {
    it("logs steps and terminates on condition", async () => {
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

      const result = await engine.run();

      assert.equal(result.terminated, true);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 2);
      assert.equal(result.trajectory.steps[0].actionId, "tick");
      assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, []);
      assert.equal(result.trajectory.steps[0].affectedGlobal, true);
      assert.equal(result.trajectory.events.at(-1)?.type, "termination");
    });

    it("max-turn cap ends the simulation with a max-turns reason", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxTurns: 1,
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 1);
    });

    it("loop detection stops repeated states with a draw outcome", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createNoopAction()];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        loopDetection: { maxRepeatedStates: 1 },
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "loop-detected");
      assert.equal(result.terminated, false);
      assert.equal(result.trajectory.steps.length, 1);
    });

    it("stalemate ends when no legal actions exist", async () => {
      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "stalemate");
      assert.equal(result.terminated, true);
      assert.equal(result.trajectory.steps.length, 1);
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
    });
  });

  describe("no-legal-actions policies", () => {
    it("terminate policy uses default outcome", async () => {
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

      const result = await engine.run();

      assert.equal(result.terminationReason, "no-legal-actions");
      assert.equal(result.terminationDetail, "policy-reason");
      assert.equal(result.terminated, true);
      assert.ok(!("reason" in result.outcome));
      assert.deepEqual(result.outcome.outcomes, { 1: "win" });
      assert.equal(result.trajectory.steps.length, 1);
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
    });

    it("pass policy records a pass step and advances", async () => {
      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];
      definition.turn.noLegalActions = { policy: "pass" };

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxTurns: 1,
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 1);
      assert.equal(result.trajectory.steps[0].actionId, null);
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
      assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, []);
      assert.equal(result.trajectory.steps[0].affectedGlobal, false);
    });

    it("error policy throws", async () => {
      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];
      definition.turn.noLegalActions = { policy: "error", reason: "no-legal-actions" };

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });

      await assert.rejects(
        async () => engine.run(),
        (err) => err instanceof Error && err.message.includes("no-legal-actions")
      );
    });
  });

  describe("step instrumentation", () => {
    it("captures per-player and trigger effects", async () => {
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

      const result = await engine.run();
      assert.equal(result.trajectory.steps.length, 1);
      assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, [1]);
      assert.equal(result.trajectory.steps[0].affectedGlobal, true);
    });

    it("attributes per-player action effects to the active player", async () => {
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

      const result = await engine.run();
      assert.equal(result.trajectory.steps.length, 1);
      assert.deepEqual(result.trajectory.steps[0].affectedPlayerIds, [1]);
      assert.equal(result.trajectory.steps[0].affectedGlobal, false);
    });
  });
});
