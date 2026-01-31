import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { terminationRemoveMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

describe("terminationRemoveMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(terminationRemoveMutation.name, "termination-remove");
  });

  it("no-op when exactly one condition exists", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.termination.conditions.length, 1);
  });

  it("removes one condition when two exist", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: "<=",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 0 },
      },
      outcome: { type: "lose", players: "active" },
    });
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.termination.conditions.length, 1);
  });

  it("never reduces below one condition", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 5 },
      },
      outcome: { type: "draw", players: "all" },
    });

    for (let seed = 0; seed < 20; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationRemoveMutation.mutate(genome, rng);
      // Started with 2, should remove to 1 but never below
      assert.ok(mutated.definition.termination.conditions.length >= 1);
    }
  });

  it("no-op when no conditions array exists", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions = [];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.termination.conditions.length, 0);
  });

  it("does not mutate the input genome", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 5 },
      },
      outcome: { type: "draw", players: "all" },
    });
    const genome = { definition };
    const rng = createSeededRng(1);

    terminationRemoveMutation.mutate(genome, rng);

    assert.equal(definition.termination.conditions.length, 2);
  });
});
