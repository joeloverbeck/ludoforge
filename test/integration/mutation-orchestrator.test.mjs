import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMutationOperators,
  mutateAndRepairGenome,
  mutateGenome,
} from "../../src/evolutionary-engine/mutation/orchestrator.js";
import {
  actionDuplicateMutation,
  booleanToggleMutation,
  numericTweakMutation,
  triggerAddMutation,
} from "../../src/evolutionary-engine/mutation.js";

describe("mutation-orchestrator", () => {
  describe("defaultMutationOperators", () => {
    it("includes expected operators", () => {
      assert.ok(defaultMutationOperators.includes(numericTweakMutation));
      assert.ok(defaultMutationOperators.includes(booleanToggleMutation));
      assert.ok(defaultMutationOperators.includes(actionDuplicateMutation));
      assert.ok(defaultMutationOperators.includes(triggerAddMutation));
    });
  });

  describe("mutateGenome", () => {
    it("selects a provided operator using rng", () => {
      const genome = { definition: { id: "base" } };
      const operators = [
        { mutate: (value) => ({ ...value, picked: "first" }) },
        { mutate: (value) => ({ ...value, picked: "second" }) },
      ];
      const rng = { nextInt: () => 1 };

      const mutated = mutateGenome(genome, { operators, rng });

      assert.equal(mutated.picked, "second");
    });

    it("returns a clone when operators are empty", () => {
      const genome = { definition: { id: "base" } };

      const mutated = mutateGenome(genome, { operators: [] });

      assert.deepEqual(mutated, genome);
      assert.notEqual(mutated, genome);
    });
  });

  describe("mutateAndRepairGenome", () => {
    it("runs repair operators", () => {
      const genome = { definition: { id: "base" } };
      const operators = [{ mutate: (value) => ({ ...value, mutated: true }) }];
      const repairOperators = [{ repair: (value) => ({ ...value, repaired: true }) }];

      const mutated = mutateAndRepairGenome(genome, { operators, repairOperators });

      assert.equal(mutated.mutated, true);
      assert.equal(mutated.repaired, true);
    });
  });
});
