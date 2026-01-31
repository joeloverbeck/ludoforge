import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { variableScopeToggleMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

describe("variableScopeToggleMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(variableScopeToggleMutation.name, "variable-scope-toggle");
  });

  it("toggles global to per_player", () => {
    const definition = structuredClone(baseDefinition);
    // baseDefinition has one variable "score" with scope "global"
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableScopeToggleMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.variables[0].scope, "per_player");
  });

  it("toggles per_player to global", () => {
    const definition = structuredClone(baseDefinition);
    definition.state.variables[0].scope = "per_player";
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableScopeToggleMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.variables[0].scope, "global");
  });

  it("no-op when no variables exist", () => {
    const definition = structuredClone(baseDefinition);
    definition.state.variables = [];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableScopeToggleMutation.mutate(genome, rng);

    assert.deepEqual(mutated.definition.state.variables, []);
  });

  it("does not mutate the input genome", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalScope = definition.state.variables[0].scope;

    variableScopeToggleMutation.mutate(genome, rng);

    assert.equal(definition.state.variables[0].scope, originalScope);
  });

  it("only toggles one variable when multiple exist", () => {
    const definition = structuredClone(baseDefinition);
    definition.state.variables.push({
      id: "health",
      scope: "per_player",
      type: { kind: "int", min: 0, max: 20 },
      initial: 10,
    });
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableScopeToggleMutation.mutate(genome, rng);

    // Exactly one variable should have changed scope
    let changed = 0;
    for (let i = 0; i < definition.state.variables.length; i++) {
      if (mutated.definition.state.variables[i].scope !== definition.state.variables[i].scope) {
        changed++;
      }
    }
    assert.equal(changed, 1);
  });
});
