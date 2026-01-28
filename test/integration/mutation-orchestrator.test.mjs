import { test } from "node:test";
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
  zoneRemoveMutation,
} from "../../src/evolutionary-engine/mutation.js";

test("defaultMutationOperators preserves the expected ordering", () => {
  assert.equal(defaultMutationOperators[0], numericTweakMutation);
  assert.equal(defaultMutationOperators[1], booleanToggleMutation);
  assert.equal(defaultMutationOperators[3], actionDuplicateMutation);
  assert.equal(defaultMutationOperators.at(-1), zoneRemoveMutation);
});

test("mutateGenome selects a provided operator using rng", () => {
  const genome = { definition: { id: "base" } };
  const operators = [
    { mutate: (value) => ({ ...value, picked: "first" }) },
    { mutate: (value) => ({ ...value, picked: "second" }) },
  ];
  const rng = { nextInt: () => 1 };

  const mutated = mutateGenome(genome, { operators, rng });

  assert.equal(mutated.picked, "second");
});

test("mutateGenome returns a clone when operators are empty", () => {
  const genome = { definition: { id: "base" } };

  const mutated = mutateGenome(genome, { operators: [] });

  assert.deepEqual(mutated, genome);
  assert.notEqual(mutated, genome);
});

test("mutateAndRepairGenome runs repair operators", () => {
  const genome = { definition: { id: "base" } };
  const operators = [{ mutate: (value) => ({ ...value, mutated: true }) }];
  const repairOperators = [{ repair: (value) => ({ ...value, repaired: true }) }];

  const mutated = mutateAndRepairGenome(genome, { operators, repairOperators });

  assert.equal(mutated.mutated, true);
  assert.equal(mutated.repaired, true);
});
