import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { conditionalEffectInsertMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("conditionalEffectInsertMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(conditionalEffectInsertMutation.name, "conditional-effect-insert");
  });

  it("wraps an existing effect in a conditional block", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    const effects = mutated.definition.actions[0].effects;
    assert.equal(effects.length, 1, "effect count stays the same (replaced in place)");
    assert.equal(effects[0].kind, "conditional");
  });

  it("places the original effect in the then branch", () => {
    const definition = cloneDefinition(baseDefinition);
    const originalEffect = structuredClone(definition.actions[0].effects[0]);
    const genome = { definition };
    const rng = createSeededRng(2);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    const conditional = mutated.definition.actions[0].effects[0];
    assert.equal(conditional.kind, "conditional");
    assert.ok(Array.isArray(conditional.then), "then branch is an array");
    assert.equal(conditional.then.length, 1);
    assert.deepStrictEqual(conditional.then[0], originalEffect);
  });

  it("generates a cmp condition referencing a valid variable", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    const conditional = mutated.definition.actions[0].effects[0];
    const condition = conditional.condition;
    assert.equal(condition.kind, "cmp");
    assert.ok(["==", "!=", "<", "<=", ">", ">="].includes(condition.op));
    assert.equal(condition.left.kind, "ref");
    assert.equal(condition.left.ref.kind, "var");

    const variableIds = definition.state.variables.map((v) => v.id);
    const tokenAttrIds = definition.state.tokenTypes.flatMap((tt) =>
      (tt.attributes || []).map((a) => a.id)
    );
    const allVarIds = [...variableIds, ...tokenAttrIds];
    assert.ok(allVarIds.includes(condition.left.ref.id));

    assert.equal(condition.right.kind, "value");
    assert.equal(typeof condition.right.value, "number");
  });

  it("returns unchanged clone when game has no actions", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition.actions, []);
  });

  it("returns unchanged clone when actions have no effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [];
    const genome = { definition };
    const rng = createSeededRng(5);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition.actions[0].effects, []);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const originalEffects = structuredClone(definition.actions[0].effects);
    const rng = createSeededRng(6);

    conditionalEffectInsertMutation.mutate(genome, rng);

    assert.deepStrictEqual(definition.actions[0].effects, originalEffects);
  });

  it("is deterministic with seeded RNG", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    const result1 = conditionalEffectInsertMutation.mutate(genome, createSeededRng(42));
    const result2 = conditionalEffectInsertMutation.mutate(genome, createSeededRng(42));

    assert.deepStrictEqual(result1.definition, result2.definition);
  });

  it("falls back to value condition when no variables exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables = [];
    definition.state.tokenTypes = [];
    const genome = { definition };
    const rng = createSeededRng(7);

    const mutated = conditionalEffectInsertMutation.mutate(genome, rng);

    const conditional = mutated.definition.actions[0].effects[0];
    assert.equal(conditional.kind, "conditional");
    assert.deepStrictEqual(conditional.condition, { kind: "value", value: true });
  });
});
