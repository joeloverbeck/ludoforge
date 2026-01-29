import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectReorderMutation } from "../../../src/evolutionary-engine/mutation.js";
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
    amount: 2,
  });
  return definition;
}

describe("effectReorderMutation", () => {
  it("reorders effects when action has >= 2 effects", () => {
    const definition = makeTwoEffectDefinition();
    const genome = { definition };

    let swapped = false;
    for (let seed = 0; seed < 20; seed++) {
      const mutated = effectReorderMutation.mutate(genome, createSeededRng(seed));
      const effects = mutated.definition.actions[0].effects;
      if (effects[0].kind === "dec" && effects[1].kind === "inc") {
        swapped = true;
        break;
      }
    }

    assert.ok(swapped, "Expected at least one seed to produce a swap");
  });

  it("does not mutate the input genome", () => {
    const definition = makeTwoEffectDefinition();
    const genome = { definition };
    const originalFirst = definition.actions[0].effects[0].kind;

    for (let seed = 0; seed < 10; seed++) {
      effectReorderMutation.mutate(genome, createSeededRng(seed));
    }

    assert.equal(definition.actions[0].effects[0].kind, originalFirst);
  });

  it("is a no-op when action has < 2 effects", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = effectReorderMutation.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 1);
    assert.deepStrictEqual(
      mutated.definition.actions[0].effects[0],
      definition.actions[0].effects[0],
    );
  });

  it("preserves the same effects, just reordered", () => {
    const definition = makeTwoEffectDefinition();
    const genome = { definition };
    const rng = createSeededRng(5);

    const mutated = effectReorderMutation.mutate(genome, rng);
    const originalKinds = definition.actions[0].effects.map((e) => e.kind).sort();
    const mutatedKinds = mutated.definition.actions[0].effects.map((e) => e.kind).sort();

    assert.deepStrictEqual(mutatedKinds, originalKinds);
  });

  it("has the correct operator name", () => {
    assert.equal(effectReorderMutation.name, "effect-reorder");
  });
});
