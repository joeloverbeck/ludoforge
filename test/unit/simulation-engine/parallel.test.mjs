import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runBatchSimulations } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
} from "./fixtures.mjs";

function buildTwoActionDefinition() {
  const definition = createBaseDefinition();
  definition.actions = [createIncrementAction(), createNoopAction()];
  definition.termination.conditions = [];
  return definition;
}

describe("parallel", () => {
  describe("runBatchSimulations concurrency", () => {
    it("parallel matches sequential for seeded agents", async () => {
      const definition = buildTwoActionDefinition();
      const inputs = [
        { definition, agents: [{ kind: "random" }], seed: 11, maxTurns: 1 },
        { definition, agents: [{ kind: "random" }], seed: 22, maxTurns: 1 },
        { definition, agents: [{ kind: "random" }], seed: 33, maxTurns: 1 },
      ];

      const sequential = await runBatchSimulations(inputs);
      const parallel = await runBatchSimulations(inputs, {}, { concurrency: 2 });

      const sequentialActions = sequential.results.map(
        (result) => result.trajectory.steps.map((step) => step.actionId),
      );
      const parallelActions = parallel.results.map(
        (result) => result.trajectory.steps.map((step) => step.actionId),
      );

      assert.deepEqual(parallelActions, sequentialActions);
      assert.deepEqual(
        parallel.results.map((result) => result.terminationReason),
        sequential.results.map((result) => result.terminationReason),
      );
    });
  });
});
