import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSeededRng } from "../../src/simulation-engine/rng.js";
import { crossoverGenome, subtreeSwapCrossover } from "../../src/evolutionary-engine/crossover.js";
import {
  actionDuplicateMutation,
  mutateAndRepairGenome,
} from "../../src/evolutionary-engine/mutation.js";
import { dslSafetyRepair } from "../../src/evolutionary-engine/repair.js";
import { validateGenomeDefinition } from "../../src/evolutionary-engine/serialization.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function buildParentB(definition) {
  const clone = structuredClone(definition);
  if (Array.isArray(clone.state?.variables) && clone.state.variables[0]) {
    clone.state.variables[0].initial = 1;
  }
  if (Array.isArray(clone.actions) && clone.actions[0]) {
    clone.actions[0].id = "charge-alt";
  }
  return clone;
}

test("mutation + repair produces valid children after crossover", async () => {
  const baseDefinition = await loadFixture("choice-game.json");

  const parentA = { id: "parent-a", definition: baseDefinition };
  const parentB = { id: "parent-b", definition: buildParentB(baseDefinition) };

  const crossoverChild = crossoverGenome(parentA, parentB, {
    operators: [subtreeSwapCrossover],
    rng: createSeededRng(2),
  });

  assert.ok(crossoverChild, "Expected crossover to return a child genome");
  assert.ok(validateGenomeDefinition(crossoverChild.definition).valid);

  const invalidChild = structuredClone(crossoverChild);
  invalidChild.definition.state.variables[0].initial = 99;

  const mutated = mutateAndRepairGenome(invalidChild, {
    operators: [actionDuplicateMutation],
    repairOperators: [dslSafetyRepair],
    rng: createSeededRng(11),
  });

  assert.ok(mutated, "Expected mutation + repair to return a genome");
  assert.ok(validateGenomeDefinition(mutated.definition).valid);

  const variable = mutated.definition.state.variables[0];
  assert.equal(variable.initial, variable.type.max);
  assert.equal(
    mutated.definition.actions.length,
    crossoverChild.definition.actions.length + 1
  );

  const children = Array.from({ length: 20 }, (_, index) =>
    mutateAndRepairGenome(invalidChild, {
      operators: [actionDuplicateMutation],
      repairOperators: [dslSafetyRepair],
      rng: createSeededRng(index + 1),
    })
  );

  children.forEach((child) => {
    assert.ok(child, "Expected every child to be generated");
    assert.ok(validateGenomeDefinition(child.definition).valid);
  });
});
