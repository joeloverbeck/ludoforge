import { test } from "node:test";
import assert from "node:assert/strict";
import { actionEffectMagnitudeMutation } from "../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "./helpers/seeded-rng.mjs";
import { genomeActionsDefinition } from "./fixtures/index.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

test("actionEffectMagnitudeMutation never yields negative amounts", () => {
  const beforeDefinition = cloneDefinition(genomeActionsDefinition);
  const genome = { definition: beforeDefinition };

  const mutated = actionEffectMagnitudeMutation.mutate(genome, createSeededRng(5));
  const nextAmount = mutated.definition.actions[0].effects[0].amount;

  assert.equal(beforeDefinition.actions[0].effects[0].amount, 0);
  assert.equal(nextAmount, 1);
  assert.ok(nextAmount >= 0);
});
