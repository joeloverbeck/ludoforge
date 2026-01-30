import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { motifInjectMutation, createMotifInjectMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("motifInjectMutation", () => {
  it("injects default motifs into an action", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = motifInjectMutation.mutate(genome, rng);

    // Default motifs are now populated, so effects should grow
    assert.ok(mutated.definition.actions[0].effects.length > 1);
  });

  it("has the correct operator name", () => {
    assert.equal(motifInjectMutation.name, "motif-inject");
  });

  it("resolves var_0 references to the genome's first variable ID", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = motifInjectMutation.mutate(genome, rng);

    const injectedEffects = mutated.definition.actions[0].effects.slice(1);
    for (const effect of injectedEffects) {
      if (effect.target?.kind === "var") {
        assert.equal(
          effect.target.id,
          "score",
          `expected "score" but got "${effect.target.id}"`
        );
      }
    }
  });
});

describe("createMotifInjectMutation", () => {
  it("injects motif effects into an action", () => {
    const motifEffects = [
      [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 3 },
        { kind: "dec", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    ];
    const operator = createMotifInjectMutation(motifEffects);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = operator.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 3);
    assert.equal(mutated.definition.actions[0].effects[1].kind, "inc");
    assert.equal(mutated.definition.actions[0].effects[1].amount, 3);
    assert.equal(mutated.definition.actions[0].effects[2].kind, "dec");
    assert.equal(mutated.definition.actions[0].effects[2].amount, 1);
  });

  it("does not mutate the input genome", () => {
    const motifEffects = [
      [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 5 }],
    ];
    const operator = createMotifInjectMutation(motifEffects);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    operator.mutate(genome, rng);

    assert.equal(definition.actions[0].effects.length, 1);
  });

  it("is a no-op when motifEffects is empty", () => {
    const operator = createMotifInjectMutation([]);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = operator.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 1);
  });

  it("is a no-op when motifEffects is undefined", () => {
    const operator = createMotifInjectMutation(undefined);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = operator.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 1);
  });

  it("picks from multiple motif sequences", () => {
    const motifEffects = [
      [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
      [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 2 }],
    ];
    const operator = createMotifInjectMutation(motifEffects);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    let callCount = 0;
    const rng = { nextInt: (n) => { callCount++; return callCount === 1 ? 1 : 0; } };

    const mutated = operator.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].effects.length, 2);
    assert.equal(mutated.definition.actions[0].effects[1].kind, "dec");
    assert.equal(mutated.definition.actions[0].effects[1].amount, 2);
  });

  it("does not mutate the motif effects themselves", () => {
    const motifEffects = [
      [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 5 }],
    ];
    const operator = createMotifInjectMutation(motifEffects);
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = { nextInt: () => 0 };

    const mutated = operator.mutate(genome, rng);
    mutated.definition.actions[0].effects[1].amount = 999;

    assert.equal(motifEffects[0][0].amount, 5);
  });

  it("has the correct operator name", () => {
    const operator = createMotifInjectMutation([]);
    assert.equal(operator.name, "motif-inject");
  });
});
