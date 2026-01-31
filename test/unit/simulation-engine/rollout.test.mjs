import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/index.js";
import { runRollout } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
} from "./fixtures.mjs";

describe("rollout", () => {
  describe("runRollout", () => {
    it("simulates from the provided state and keeps input immutable", async () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const state = createInitialState(definition);
      state.variables.global.counter = 5;
      const snapshot = JSON.stringify(state);

      const result = await runRollout({
        definition,
        state,
        agent: { kind: "greedy" },
        maxSteps: 1,
      });

      assert.equal(result.terminationReason, "max-steps");
      assert.equal(result.terminated, false);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 1);
      assert.equal(result.trajectory.steps[0].state.variables.global.counter, 6);
      assert.equal(JSON.stringify(state), snapshot);
    });

    it("is deterministic when seeded", async () => {
      const definition = createBaseDefinition();
      const actionA = createIncrementAction();
      const actionB = createNoopAction();
      definition.actions = [actionA, actionB];
      definition.termination.conditions = [];

      const state = createInitialState(definition);

      const resultA = await runRollout({
        definition,
        state,
        agent: { kind: "random" },
        seed: 123,
        maxSteps: 3,
      });
      const resultB = await runRollout({
        definition,
        state,
        agent: { kind: "random" },
        seed: 123,
        maxSteps: 3,
      });

      const actionsA = resultA.trajectory.steps.map((step) => step.actionId);
      const actionsB = resultB.trajectory.steps.map((step) => step.actionId);

      assert.deepEqual(actionsA, actionsB);
    });
  });

  describe("input validation", () => {
    it("rejects missing required inputs", async () => {
      const definition = createBaseDefinition();
      const state = createInitialState(definition);

      await assert.rejects(async () => runRollout({ state, agent: { kind: "random" } }), /definition/);
      await assert.rejects(async () => runRollout({ definition, agent: { kind: "random" } }), /state/);
      await assert.rejects(async () => runRollout({ definition, state }), /agent/);
    });
  });
});
