import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectParamTweakMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("effectParamTweakMutation", () => {
  it("tweaks numeric amount on inc/dec effects", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = effectParamTweakMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects[0].amount, 1);
    assert.notEqual(mutated.definition.actions[0].effects[0].amount, undefined);
    assert.equal(typeof mutated.definition.actions[0].effects[0].amount, "number");
  });

  it("tweaks numeric value on set effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      { kind: "set", target: { kind: "var", id: "score" }, value: 5 },
    ];
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = effectParamTweakMutation.mutate(genome, rng);

    assert.equal(typeof mutated.definition.actions[0].effects[0].value, "number");
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };
    const originalAmount = definition.actions[0].effects[0].amount;

    effectParamTweakMutation.mutate(genome, rng);

    assert.equal(definition.actions[0].effects[0].amount, originalAmount);
  });

  it("is a no-op when no numeric effects exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      { kind: "destroy", target: { kind: "token", id: "pawn" } },
    ];
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = effectParamTweakMutation.mutate(genome, rng);

    assert.deepStrictEqual(
      mutated.definition.actions[0].effects[0],
      { kind: "destroy", target: { kind: "token", id: "pawn" } },
    );
  });

  it("has the correct operator name", () => {
    assert.equal(effectParamTweakMutation.name, "effect-param-tweak");
  });
});
