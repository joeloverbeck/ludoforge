import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { zoneAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("zoneAddMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(zoneAddMutation.name, "zone-add");
  });

  it("adds a new zone to the definition", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalZoneCount = definition.state.zones.length;

    const mutated = zoneAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.zones.length, originalZoneCount + 1);
  });

  it("new zone references an existing token type", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);
    const tokenTypeIds = definition.state.tokenTypes.map((t) => t.id);

    const mutated = zoneAddMutation.mutate(genome, rng);
    const newZone = mutated.definition.state.zones.at(-1);

    assert.ok(tokenTypeIds.includes(newZone.tokenType));
  });

  it("new zone has required properties", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = zoneAddMutation.mutate(genome, rng);
    const newZone = mutated.definition.state.zones.at(-1);

    assert.equal(typeof newZone.id, "string");
    assert.equal(typeof newZone.tokenType, "string");
    assert.ok(["global", "per_player"].includes(newZone.scope));
    assert.ok(["ordered", "unordered"].includes(newZone.order));
    assert.ok(["public", "private"].includes(newZone.visibility));
  });

  it("new zone has a unique id", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(4);
    const existingIds = new Set(definition.state.zones.map((z) => z.id));

    const mutated = zoneAddMutation.mutate(genome, rng);
    const newZone = mutated.definition.state.zones.at(-1);

    assert.ok(!existingIds.has(newZone.id));
  });

  it("is a no-op when no token types exist", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state.tokenTypes;
    const genome = { definition };
    const rng = createSeededRng(5);

    const mutated = zoneAddMutation.mutate(genome, rng);

    // zones should not be augmented (or may be undefined)
    const zones = mutated.definition.state?.zones ?? [];
    assert.ok(zones.length <= (definition.state?.zones?.length ?? 0));
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(6);
    const originalZoneCount = definition.state.zones.length;

    zoneAddMutation.mutate(genome, rng);

    assert.equal(definition.state.zones.length, originalZoneCount);
  });
});
