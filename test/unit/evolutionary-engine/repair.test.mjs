import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairGenome } from "../../../src/evolutionary-engine/repair.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("repairGenome", () => {
  it("returns null when actions are empty", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns null when zones are empty but effects reference zones", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.zones = [];
    definition.actions[0].effects.push({
      kind: "move",
      toZone: "board",
    });

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns null when termination conditions are empty", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.termination.conditions = [];

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns null when all actions have empty effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = definition.actions.map((action) => ({
      ...action,
      effects: [],
    }));

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns a repaired genome for valid structure", () => {
    const definition = cloneDefinition(baseDefinition);

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.notEqual(repaired, definition);
    assert.equal(repaired.definition.actions.length, 1);
  });
});
