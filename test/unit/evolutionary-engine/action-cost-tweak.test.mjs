import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actionCostTweakMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { validateGameDefinition } from "../../../src/dsl/validate.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function createSequenceRng(values) {
  let index = 0;
  return {
    nextInt(max) {
      const value = values[index] ?? 0;
      index += 1;
      if (max <= 1) return 0;
      if (value < 0) return 0;
      if (value >= max) return max - 1;
      return value;
    },
  };
}

describe("actionCostTweakMutation", () => {
  it("tweaks a cost amount by ±1 or ±2", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 3 },
    ];
    const genome = { definition };
    const rng = createSequenceRng([0, 1, 1]);

    const mutated = actionCostTweakMutation.mutate(genome, rng);
    const nextAmount = mutated.definition.actions[0].costs[0].amount;

    assert.ok([1, 2].includes(Math.abs(nextAmount - 3)));
  });

  it("clamps cost amounts to a minimum of 1", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 1 },
    ];
    const genome = { definition };
    const rng = createSequenceRng([0, 1, 0]);

    const mutated = actionCostTweakMutation.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].costs[0].amount, 1);
  });

  it("is a no-op when no actions have costs", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSequenceRng([0]);

    const mutated = actionCostTweakMutation.mutate(genome, rng);

    assert.deepStrictEqual(mutated.definition, definition);
  });

  it("is deterministic with seeded RNG", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 4 },
    ];

    const first = actionCostTweakMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42)
    );
    const second = actionCostTweakMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42)
    );

    assert.deepStrictEqual(
      first.definition.actions[0].costs,
      second.definition.actions[0].costs
    );
  });

  it("tweaks one of multiple costs and keeps schema valid", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 5 },
    ];
    const genome = { definition };
    const rng = createSequenceRng([1, 0, 1]);

    const mutated = actionCostTweakMutation.mutate(genome, rng);
    const costs = mutated.definition.actions[0].costs;

    const changed = costs.filter((cost, index) => cost.amount !== definition.actions[0].costs[index].amount);
    assert.equal(changed.length, 1);

    const validation = validateGameDefinition(mutated.definition);
    assert.equal(validation.valid, true);
  });
});
