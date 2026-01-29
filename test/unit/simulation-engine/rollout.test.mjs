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
    it("simulates from the provided state and keeps input immutable", () => {
      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const state = createInitialState(definition);
      state.variables.global.counter = 5;
      const snapshot = JSON.stringify(state);

      const result = runRollout({
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

    it("is deterministic when seeded", () => {
      const definition = createBaseDefinition();
      const actionA = createIncrementAction();
      const actionB = createNoopAction();
      definition.actions = [actionA, actionB];
      definition.termination.conditions = [];

      const state = createInitialState(definition);

      const resultA = runRollout({
        definition,
        state,
        agent: { kind: "random" },
        seed: 123,
        maxSteps: 3,
      });
      const resultB = runRollout({
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
    it("rejects missing required inputs", () => {
      const definition = createBaseDefinition();
      const state = createInitialState(definition);

      assert.throws(() => runRollout({ state, agent: { kind: "random" } }), /definition/);
      assert.throws(() => runRollout({ definition, agent: { kind: "random" } }), /state/);
      assert.throws(() => runRollout({ definition, state }), /agent/);
    });
  });
});
