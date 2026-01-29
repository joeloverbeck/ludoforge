import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectDeleteMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function makeTwoEffectDefinition() {
  const definition = cloneDefinition(baseDefinition);
  definition.actions[0].effects.push({
    kind: "dec",
    target: { kind: "var", id: "score" },
    amount: 1,
  });
  return definition;
}

describe("effectDeleteMutation", () => {
  it("removes an effect when action has >= 2 effects", () => {
    const definition = makeTwoEffectDefinition();
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = effectDeleteMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects.length, 2);
    assert.equal(mutated.definition.actions[0].effects.length, 1);
  });

  it("does not mutate the input genome", () => {
    const definition = makeTwoEffectDefinition();
    const genome = { definition };
    const rng = createSeededRng(2);

    effectDeleteMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects.length, 2);
  });

  it("is a no-op when action has only 1 effect", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = effectDeleteMutation.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 1);
  });

  it("is a no-op when no actions exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = effectDeleteMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition.actions, []);
  });

  it("has the correct operator name", () => {
    assert.equal(effectDeleteMutation.name, "effect-delete");
  });
});
