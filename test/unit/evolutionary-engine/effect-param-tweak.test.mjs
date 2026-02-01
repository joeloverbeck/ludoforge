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

  it("set value stays within variable [min, max] after mutation", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10
    definition.actions[0].effects = [
      { kind: "set", target: { kind: "var", id: "score" }, value: 10 },
    ];
    const genome = { definition };
    // direction = -1 (nextInt(2)===0 → direction=-1)
    const rng = { nextInt: () => 0 };

    const mutated = effectParamTweakMutation.mutate(genome, rng);
    const newValue = mutated.definition.actions[0].effects[0].value;

    assert.ok(newValue >= 0, `value ${newValue} should be >= 0`);
    assert.ok(newValue <= 10, `value ${newValue} should be <= 10`);
  });

  it("inc amount does not exceed variable range after mutation", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10, range=10
    definition.actions[0].effects = [
      { kind: "inc", target: { kind: "var", id: "score" }, amount: 10 },
    ];
    const genome = { definition };
    // nextInt(1)→0 for target selection, nextInt(2)→1 for direction
    const rng = { nextInt: (n) => (n <= 1 ? 0 : 1) };

    const mutated = effectParamTweakMutation.mutate(genome, rng);
    const newAmount = mutated.definition.actions[0].effects[0].amount;

    assert.ok(newAmount >= 0, `amount ${newAmount} should be >= 0`);
    assert.ok(newAmount <= 10, `amount ${newAmount} should be <= range 10`);
  });

  it("falls back to tweakNonNegative for unknown variables", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      { kind: "set", target: { kind: "var", id: "nonexistent" }, value: 5 },
    ];
    const genome = { definition };
    // nextInt(1)→0 for target selection, nextInt(2)→1 for direction
    const rng = { nextInt: (n) => (n <= 1 ? 0 : 1) };

    const mutated = effectParamTweakMutation.mutate(genome, rng);
    const newValue = mutated.definition.actions[0].effects[0].value;

    assert.equal(typeof newValue, "number");
    assert.ok(newValue >= 0, "fallback should produce non-negative value");
  });
});
