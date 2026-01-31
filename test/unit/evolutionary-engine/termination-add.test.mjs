import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { terminationAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

describe("terminationAddMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(terminationAddMutation.name, "termination-add");
  });

  it("adds a termination condition", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.termination.conditions.length, 2);
  });

  it("new condition references an existing variable", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const varIds = definition.state.variables.map((v) => v.id);

    const mutated = terminationAddMutation.mutate(genome, rng);
    const newCond = mutated.definition.termination.conditions.at(-1);

    assert.equal(newCond.condition.kind, "cmp");
    assert.equal(newCond.condition.left.kind, "ref");
    assert.ok(varIds.includes(newCond.condition.left.ref.id));
  });

  it("new condition has valid comparator", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const validOps = [">=", "<=", ">", "<", "=="];

    const mutated = terminationAddMutation.mutate(genome, rng);
    const newCond = mutated.definition.termination.conditions.at(-1);

    assert.ok(validOps.includes(newCond.condition.op));
  });

  it("threshold is within variable bounds", () => {
    const definition = structuredClone(baseDefinition);
    for (let seed = 0; seed < 50; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationAddMutation.mutate(genome, rng);
      const newCond = mutated.definition.termination.conditions.at(-1);
      const threshold = newCond.condition.right.value;
      // score variable: min=0, max=10
      assert.ok(threshold >= 0 && threshold <= 10, `Threshold ${threshold} out of [0, 10]`);
    }
  });

  it("threshold is not trivially true at turn 0 (greater than initial)", () => {
    const definition = structuredClone(baseDefinition);
    for (let seed = 0; seed < 50; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationAddMutation.mutate(genome, rng);
      const newCond = mutated.definition.termination.conditions.at(-1);
      const threshold = newCond.condition.right.value;
      // initial is 0, threshold should be > 0
      assert.ok(threshold > 0, `Threshold ${threshold} should be > initial (0)`);
    }
  });

  it("new condition has valid outcome", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const validTypes = ["win", "lose", "draw"];
    const validPlayers = ["active", "all"];

    const mutated = terminationAddMutation.mutate(genome, rng);
    const newCond = mutated.definition.termination.conditions.at(-1);

    assert.ok(validTypes.includes(newCond.outcome.type));
    assert.ok(validPlayers.includes(newCond.outcome.players));
  });

  it("never produces players: 'inactive' (invalid per JSON Schema)", () => {
    const definition = structuredClone(baseDefinition);
    for (let seed = 0; seed < 200; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationAddMutation.mutate(genome, rng);
      const conditions = mutated.definition.termination.conditions;
      for (const cond of conditions) {
        assert.notEqual(
          cond.outcome.players,
          "inactive",
          `Seed ${seed} produced invalid players: "inactive"`,
        );
      }
    }
  });

  it("no-op when no int variables exist", () => {
    const definition = structuredClone(baseDefinition);
    definition.state.variables = [
      {
        id: "flag",
        scope: "global",
        type: { kind: "bool" },
        initial: false,
      },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.termination.conditions.length, 1);
  });

  it("creates termination section if missing", () => {
    const definition = structuredClone(baseDefinition);
    delete definition.termination;
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationAddMutation.mutate(genome, rng);

    assert.ok(mutated.definition.termination);
    assert.ok(Array.isArray(mutated.definition.termination.conditions));
    assert.equal(mutated.definition.termination.conditions.length, 1);
  });

  it("does not mutate the input genome", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    terminationAddMutation.mutate(genome, rng);

    assert.equal(definition.termination.conditions.length, 1);
  });
});
