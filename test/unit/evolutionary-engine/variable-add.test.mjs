import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { variableAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("variableAddMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(variableAddMutation.name, "variable-add");
  });

  it("adds a variable to the definition", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalCount = definition.state.variables.length;

    const mutated = variableAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.variables.length, originalCount + 1);
  });

  it("new variable has a unique id", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableAddMutation.mutate(genome, rng);
    const ids = mutated.definition.state.variables.map((v) => v.id);
    const uniqueIds = new Set(ids);

    assert.equal(ids.length, uniqueIds.size);
  });

  it("new variable has valid scope", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableAddMutation.mutate(genome, rng);
    const newVar = mutated.definition.state.variables.at(-1);

    assert.ok(["global", "per_player"].includes(newVar.scope));
  });

  it("int variable has min < max and initial in range", () => {
    const definition = cloneDefinition(baseDefinition);
    let found = false;
    for (let seed = 0; seed < 100; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = variableAddMutation.mutate(genome, rng);
      const newVar = mutated.definition.state.variables.at(-1);
      if (newVar.type.kind === "int") {
        assert.ok(newVar.type.min < newVar.type.max, `min (${newVar.type.min}) should be < max (${newVar.type.max})`);
        assert.ok(newVar.initial >= newVar.type.min, `initial (${newVar.initial}) should be >= min (${newVar.type.min})`);
        assert.ok(newVar.initial <= newVar.type.max, `initial (${newVar.initial}) should be <= max (${newVar.type.max})`);
        found = true;
        break;
      }
    }
    assert.ok(found, "Should produce at least one int variable in 100 seeds");
  });

  it("bool variable has boolean initial", () => {
    const definition = cloneDefinition(baseDefinition);
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = variableAddMutation.mutate(genome, rng);
      const newVar = mutated.definition.state.variables.at(-1);
      if (newVar.type.kind === "bool") {
        assert.equal(typeof newVar.initial, "boolean");
        found = true;
        break;
      }
    }
    assert.ok(found, "Should produce at least one bool variable in 500 seeds");
  });

  it("enum variable has non-empty values and initial in values", () => {
    const definition = cloneDefinition(baseDefinition);
    let found = false;
    for (let seed = 0; seed < 500; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = variableAddMutation.mutate(genome, rng);
      const newVar = mutated.definition.state.variables.at(-1);
      if (newVar.type.kind === "enum") {
        assert.ok(Array.isArray(newVar.type.values));
        assert.ok(newVar.type.values.length > 0);
        assert.ok(newVar.type.values.includes(newVar.initial));
        found = true;
        break;
      }
    }
    assert.ok(found, "Should produce at least one enum variable in 500 seeds");
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalCount = definition.state.variables.length;

    variableAddMutation.mutate(genome, rng);

    assert.equal(definition.state.variables.length, originalCount);
  });

  it("biases toward per_player int with priority_queue scheduler", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = { scheduler: "priority_queue", orderBy: { variable: "score" } };
    let perPlayerIntCount = 0;
    const total = 100;
    for (let seed = 0; seed < total; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = variableAddMutation.mutate(genome, rng);
      const newVar = mutated.definition.state.variables.at(-1);
      if (newVar.scope === "per_player" && newVar.type.kind === "int") {
        perPlayerIntCount++;
      }
    }
    assert.ok(
      perPlayerIntCount > total * 0.3,
      `Expected >30% per_player int with priority_queue, got ${perPlayerIntCount}/${total}`,
    );
  });

  it("works when definition has no state", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state;
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableAddMutation.mutate(genome, rng);

    assert.ok(Array.isArray(mutated.definition.state.variables));
    assert.equal(mutated.definition.state.variables.length, 1);
  });

  it("works when definition has no variables array", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state.variables;
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableAddMutation.mutate(genome, rng);

    assert.ok(Array.isArray(mutated.definition.state.variables));
    assert.equal(mutated.definition.state.variables.length, 1);
  });
});
