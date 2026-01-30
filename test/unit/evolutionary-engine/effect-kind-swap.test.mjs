import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectKindSwapMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("effectKindSwapMutation", () => {
  it("changes the effect kind", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = effectKindSwapMutation.mutate(genome, rng);
    const originalKind = definition.actions[0].effects[0].kind;
    const newKind = mutated.definition.actions[0].effects[0].kind;

    const validKinds = ["set", "inc", "dec", "move", "spawn", "destroy", "reveal", "hide"];
    assert.ok(validKinds.includes(newKind));
    assert.notEqual(newKind, originalKind);
  });

  it("builds a target ref appropriate for the new kind", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);

    const mutated = effectKindSwapMutation.mutate(genome, rng);
    const effect = mutated.definition.actions[0].effects[0];

    // The target should exist and be an object with a kind property
    assert.ok(effect.target);
    assert.equal(typeof effect.target.kind, "string");
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);
    const originalKind = definition.actions[0].effects[0].kind;

    effectKindSwapMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects[0].kind, originalKind);
  });

  it("adds appropriate props for the new kind", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = effectKindSwapMutation.mutate(genome, rng);
    const effect = mutated.definition.actions[0].effects[0];

    if (effect.kind === "inc" || effect.kind === "dec") {
      assert.equal(typeof effect.amount, "number");
    } else if (effect.kind === "set") {
      assert.equal(typeof effect.value, "number");
    } else if (effect.kind === "move" || effect.kind === "spawn") {
      assert.equal(typeof effect.toZone, "string");
    }
  });

  it("has the correct operator name", () => {
    assert.equal(effectKindSwapMutation.name, "effect-kind-swap");
  });
});
