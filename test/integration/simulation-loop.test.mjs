import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../src/game-kernel/index.js";
import {
  createSimulationEngine,
  runRollout,
} from "../../src/simulation-engine/index.js";

function createBaseDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [],
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: { conditions: [] },
    triggers: [],
  };
}

function createIncrementAction() {
  return {
    id: "tick",
    actor: "player",
    effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
  };
}

function createNoopAction() {
  return {
    id: "noop",
    actor: "player",
    effects: [],
  };
}

function createFirstActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[0]?.id;
    },
  };
}

function winWhenCounterReaches(n) {
  return {
    condition: {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "counter" } },
      right: { kind: "value", value: n },
    },
    outcome: { type: "win", players: "active" },
  };
}

describe("simulation-loop integration", () => {
  describe("termination on game condition", () => {
    it("terminates when a win condition is met", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [winWhenCounterReaches(3)];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });
      const result = await engine.run();

      assert.equal(result.terminationReason, "condition");
      assert.equal(result.terminated, true);
      assert.ok(result.trajectory.steps.length >= 3);
    });
  });

  describe("max-turns termination", () => {
    it("terminates when maxTurns is reached", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxTurns: 2,
      });
      const result = await engine.run();

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
    });
  });

  describe("max-steps termination", () => {
    it("terminates when maxSteps is reached", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxSteps: 2,
      });
      const result = await engine.run();

      assert.equal(result.terminationReason, "max-steps");
      assert.equal(result.terminated, false);
    });
  });

  describe("loop detection termination", () => {
    it("terminates when repeated state is detected", async () => {
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
    });
  });

  describe("stalemate (default no-legal-actions)", () => {
    it("returns stalemate when no actions and no policy", async () => {
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
      assert.ok(result.trajectory.steps.length >= 1);
    });
  });

  describe("no-legal-actions pass policy", () => {
    it("passes and advances turn when no legal actions with pass policy", async () => {
      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];
      definition.turn.noLegalActions = { policy: "pass" };

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxTurns: 2,
      });
      const result = await engine.run();

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
      const passSteps = result.trajectory.steps.filter((s) => s.actionId === null);
      assert.ok(passSteps.length > 0, "should have at least one pass step");
    });
  });

  describe("no-legal-actions terminate policy", () => {
    it("terminates with custom outcome when no legal actions", async () => {
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
      const result = await engine.run();

      assert.equal(result.terminationReason, "no-legal-actions");
      assert.equal(result.terminated, true);
    });
  });

  describe("no-legal-actions error policy", () => {
    it("throws when no legal actions with error policy", async () => {
      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];
      definition.turn.noLegalActions = {
        policy: "error",
        reason: "custom-reason",
      };

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });

      await assert.rejects(async () => engine.run(), {
        message: /No legal actions: custom-reason/,
      });
    });
  });

  describe("agent action selection and validation", () => {
    it("produces correct trajectory with valid agent actions", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [winWhenCounterReaches(2)];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });
      const result = await engine.run();

      assert.equal(result.terminated, true);
      const actionSteps = result.trajectory.steps.filter((s) => s.actionId === "tick");
      assert.ok(actionSteps.length >= 2, "should have at least 2 tick actions");
      for (const step of actionSteps) {
        assert.equal(step.actionId, "tick");
        assert.ok(step.legalActionCount > 0);
      }
    });
  });

  describe("post-action termination check", () => {
    it("terminates immediately after action triggers win", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [winWhenCounterReaches(1)];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
      });
      const result = await engine.run();

      assert.equal(result.terminationReason, "condition");
      assert.equal(result.terminated, true);
      const actionSteps = result.trajectory.steps.filter((s) => s.actionId !== null);
      assert.equal(actionSteps.length, 1, "should terminate after exactly 1 action");
    });
  });

  describe("rollout uses extracted helpers", () => {
    it("rollout respects max-steps through refactored loop", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const state = createInitialState(definition);
      const result = await runRollout({
        definition,
        state,
        agent: { kind: "greedy" },
        maxSteps: 3,
      });

      assert.equal(result.terminationReason, "max-steps");
      assert.equal(result.terminated, false);
    });
  });
});
