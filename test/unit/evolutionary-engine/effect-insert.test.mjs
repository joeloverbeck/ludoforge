import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectInsertMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("effectInsertMutation", () => {
  it("adds an effect to an action", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = effectInsertMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects.length, 1);
    assert.equal(mutated.definition.actions[0].effects.length, 2);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);
    const originalEffectsLength = definition.actions[0].effects.length;

    effectInsertMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects.length, originalEffectsLength);
  });

  it("produces an effect with a valid kind", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = effectInsertMutation.mutate(genome, rng);
    const newEffect = mutated.definition.actions[0].effects[1];

    const validKinds = ["set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide"];
    assert.ok(validKinds.includes(newEffect.kind));
    assert.ok(newEffect.target);
  });

  it("returns clone when no actions exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = effectInsertMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition.actions, []);
  });

  it("has the correct operator name", () => {
    assert.equal(effectInsertMutation.name, "effect-insert");
  });
});
