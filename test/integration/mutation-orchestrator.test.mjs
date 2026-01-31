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
import { createMutationSelector } from "../../src/evolution-runner/operator-setup.js";

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
    it("throws when called without a selector", () => {
      const genome = { definition: { id: "base" } };
      const operators = [
        { mutate: (value) => ({ ...value, picked: "first" }) },
      ];
      const rng = { nextInt: () => 0 };

      assert.throws(
        () => mutateGenome(genome, { operators, rng }),
        /requires a selector/,
      );
    });

    it("selects a provided operator using selector", () => {
      const genome = { definition: { id: "base" } };
      const operators = [
        { name: "first", mutate: (value) => ({ ...value, picked: "first" }) },
        { name: "second", mutate: (value) => ({ ...value, picked: "second" }) },
      ];
      const rng = { nextInt: () => 1 };
      const selector = { pick: () => "second" };

      const mutated = mutateGenome(genome, { operators, rng, selector });

      assert.equal(mutated.genome.picked, "second");
      assert.equal(mutated.operatorName, "second");
    });

    it("returns a clone when operators are empty", () => {
      const genome = { definition: { id: "base" } };
      const selector = { pick: () => "anything" };

      const mutated = mutateGenome(genome, { operators: [], selector });

      assert.deepEqual(mutated.genome, genome);
      assert.notEqual(mutated.genome, genome);
      assert.equal(mutated.operatorName, null);
    });
  });

  describe("mutateAndRepairGenome", () => {
    it("runs repair operators", () => {
      const genome = { definition: { id: "base" } };
      const operators = [{ name: "mutator", mutate: (value) => ({ ...value, mutated: true }) }];
      const repairOperators = [{ repair: (value) => ({ ...value, repaired: true }) }];
      const selector = { pick: () => "mutator" };

      const result = mutateAndRepairGenome(genome, { operators, repairOperators, selector });

      assert.equal(result.outcome, "ok");
      assert.equal(result.genome.mutated, true);
      assert.equal(result.genome.repaired, true);
    });
  });
});
