import { test } from "node:test";
import assert from "node:assert/strict";
import {
  booleanToggleMutation,
  mutateAndRepairGenome,
  numericTweakMutation,
} from "../../../src/evolutionary-engine/mutation.js";
import { repairGenome } from "../../../src/evolutionary-engine/repair.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function makeBoolDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.variables.push({
    id: "flag",
    scope: "global",
    type: { kind: "bool" },
    initial: false,
  });
  return definition;
}

function makeEnumDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.state.tokenTypes[0].attributes.push({
    id: "color",
    scope: "global",
    type: { kind: "enum", values: ["red", "blue"] },
    initial: "red",
  });
  return definition;
}

test("numericTweakMutation adjusts int initial within bounds without mutating input", () => {
  const definition = cloneDefinition(baseDefinition);
  const genome = { definition };

  const mutated = numericTweakMutation.mutate(genome, createSeededRng(1));

  assert.notStrictEqual(mutated.definition, definition);
  assert.equal(definition.state.variables[0].initial, 0);
  assert.equal(mutated.definition.state.variables[0].initial, 1);
});

test("booleanToggleMutation flips boolean variable initial", () => {
  const definition = makeBoolDefinition();
  const genome = { definition };

  const mutated = booleanToggleMutation.mutate(genome, createSeededRng(2));

  const boolIndex = mutated.definition.state.variables.findIndex((variable) => variable.id === "flag");
  assert.equal(definition.state.variables[boolIndex].initial, false);
  assert.equal(mutated.definition.state.variables[boolIndex].initial, true);
});

test("repairGenome clamps int initial and restores enum defaults", () => {
  const definition = makeEnumDefinition();
  definition.state.variables[0].initial = 999;
  definition.state.tokenTypes[0].attributes[1].initial = "green";
  const genome = { definition };

  const repaired = repairGenome(genome);

  assert.ok(repaired);
  assert.equal(repaired.definition.state.variables[0].initial, 10);
  assert.equal(repaired.definition.state.tokenTypes[0].attributes[1].initial, "red");
});

test("mutateAndRepairGenome returns null on invalid int bounds", () => {
  const definition = cloneDefinition(baseDefinition);
  definition.state.variables[0].type = { kind: "int", min: 5, max: 1 };
  const genome = { definition };

  const repaired = mutateAndRepairGenome(genome, {
    operators: [numericTweakMutation],
  });

  assert.equal(repaired, null);
});
