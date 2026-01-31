import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { triggerRemoveMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("triggerRemoveMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(triggerRemoveMutation.name, "trigger-remove");
  });

  it("removes exactly one trigger", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      { event: "end_turn", effects: [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 1 }] },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, 1);
  });

  it("is a no-op when no triggers exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, 0);
  });

  it("is a no-op when triggers array is missing", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.triggers;
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerRemoveMutation.mutate(genome, rng);

    assert.ok(Array.isArray(mutated.definition.triggers) || mutated.definition.triggers === undefined);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      { event: "end_turn", effects: [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 1 }] },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    triggerRemoveMutation.mutate(genome, rng);

    assert.equal(definition.triggers.length, 2);
  });

  it("can remove the only trigger", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, 0);
  });
});
