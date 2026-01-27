import { test } from "node:test";
import assert from "node:assert/strict";

import { subtreeSwapCrossover } from "../../src/evolutionary-engine/crossover.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function makeRenamedVariableDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.variables[0].id = "points";
  definition.actions[0].effects[0].target.id = "points";
  definition.termination.conditions[0].condition.left.ref.id = "points";
  return definition;
}

test("subtreeSwapCrossover swaps action lists without mutating parents", () => {
  const parentA = { definition: cloneDefinition(baseDefinition) };
  const parentBDefinition = cloneDefinition(baseDefinition);
  const baseAction = structuredClone(baseDefinition.actions[0]);
  parentBDefinition.actions = [{ ...baseAction, id: "pass" }];
  const parentB = { definition: parentBDefinition };
  const rng = { nextInt: () => 1 };

  const child = subtreeSwapCrossover.crossover(parentA, parentB, rng);

  assert.ok(child);
  assert.equal(parentA.definition.actions[0].id, "move");
  assert.equal(parentB.definition.actions[0].id, "pass");
  assert.equal(child.definition.actions[0].id, "pass");
  assert.notStrictEqual(child.definition.actions, parentA.definition.actions);
});

test("subtreeSwapCrossover returns null when swap breaks DSL references", () => {
  const parentA = { definition: cloneDefinition(baseDefinition) };
  const parentB = { definition: makeRenamedVariableDefinition() };
  const rng = { nextInt: () => 0 };

  const child = subtreeSwapCrossover.crossover(parentA, parentB, rng);

  assert.equal(child, null);
});
