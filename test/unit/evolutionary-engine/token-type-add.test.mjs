import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tokenTypeAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("tokenTypeAddMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(tokenTypeAddMutation.name, "token-type-add");
  });

  it("adds a new token type to the definition", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalCount = definition.state.tokenTypes.length;

    const mutated = tokenTypeAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.tokenTypes.length, originalCount + 1);
  });

  it("adds a companion zone for the new token type", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);
    const originalZoneCount = definition.state.zones.length;

    const mutated = tokenTypeAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.zones.length, originalZoneCount + 1);
  });

  it("companion zone references the new token type", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = tokenTypeAddMutation.mutate(genome, rng);
    const newTokenType = mutated.definition.state.tokenTypes.at(-1);
    const newZone = mutated.definition.state.zones.at(-1);

    assert.equal(newZone.tokenType, newTokenType.id);
  });

  it("new token type has attributes with valid structure", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = tokenTypeAddMutation.mutate(genome, rng);
    const newTokenType = mutated.definition.state.tokenTypes.at(-1);

    assert.ok(Array.isArray(newTokenType.attributes));
    assert.ok(newTokenType.attributes.length > 0);
    assert.equal(newTokenType.attributes[0].id, "value");
    assert.equal(newTokenType.attributes[0].type.kind, "int");
  });

  it("new token type has a unique id", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(5);
    const existingIds = new Set(definition.state.tokenTypes.map((t) => t.id));

    const mutated = tokenTypeAddMutation.mutate(genome, rng);
    const newTokenType = mutated.definition.state.tokenTypes.at(-1);

    assert.ok(!existingIds.has(newTokenType.id));
  });

  it("works when no token types exist yet", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state.tokenTypes;
    delete definition.state.zones;
    const genome = { definition };
    const rng = createSeededRng(6);

    const mutated = tokenTypeAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.tokenTypes.length, 1);
    assert.equal(mutated.definition.state.zones.length, 1);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(7);
    const originalCount = definition.state.tokenTypes.length;

    tokenTypeAddMutation.mutate(genome, rng);

    assert.equal(definition.state.tokenTypes.length, originalCount);
  });
});
