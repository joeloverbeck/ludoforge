import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actionCostRemoveMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { validateGameDefinition } from "../../../src/dsl/validate.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("actionCostRemoveMutation", () => {
  it("removes a cost from an action", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 3 },
    ];
    const genome = { definition };
    const rng = createSeededRng(42);

    const mutated = actionCostRemoveMutation.mutate(genome, rng);
    const costs = mutated.definition.actions[0].costs;

    assert.ok(Array.isArray(costs));
    assert.equal(costs.length, 1);
  });

  it("removes costs property when last cost removed", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
    ];
    const genome = { definition };
    const rng = createSeededRng(42);

    const mutated = actionCostRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].costs, undefined);
  });

  it("noOp when no actions have costs", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(42);

    const mutated = actionCostRemoveMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition.actions, definition.actions);
  });

  it("does not mutate input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
    ];
    const genome = { definition };
    const originalJson = JSON.stringify(genome);
    const rng = createSeededRng(0);

    actionCostRemoveMutation.mutate(genome, rng);

    assert.equal(JSON.stringify(genome), originalJson);
  });

  it("is deterministic with seeded RNG", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 5 },
    ];

    const first = actionCostRemoveMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42),
    );
    const second = actionCostRemoveMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42),
    );

    assert.deepStrictEqual(first.definition, second.definition);
  });

  it("result passes schema validation", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
    ];
    const genome = { definition };

    for (let seed = 0; seed < 10; seed++) {
      const rng = createSeededRng(seed);
      const mutated = actionCostRemoveMutation.mutate(genome, rng);
      const validation = validateGameDefinition(mutated.definition);
      assert.ok(
        validation.valid,
        `seed ${seed} schema invalid: ${JSON.stringify(validation.errors)}`,
      );
    }
  });
});
