import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGenomeId,
  serializeGenome,
  validateGenomeDefinition,
} from "../../../src/evolutionary-engine/serialization.js";
import {
  baseDefinition,
  missingMaxTurnsDefinition,
  noMeaningfulActionsDefinition,
} from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("serialization", () => {
  describe("serializeGenome", () => {
    it("is deterministic for identical definitions", () => {
      const definition = cloneDefinition(baseDefinition);
      const first = serializeGenome(definition);
      const second = serializeGenome(definition);

      assert.equal(first, second);
    });
  });

  describe("createGenomeId", () => {
    it("is stable across equivalent definitions", () => {
      const definition = cloneDefinition(baseDefinition);
      const reordered = {
        actions: definition.actions,
        state: definition.state,
        players: definition.players,
        termination: definition.termination,
        turn: definition.turn,
        version: definition.version,
      };

      const idA = createGenomeId(definition);
      const idB = createGenomeId(reordered);

      assert.equal(idA, idB);
    });

    it("throws on invalid definitions", () => {
      assert.throws(() => createGenomeId(cloneDefinition(missingMaxTurnsDefinition)));
    });
  });

  describe("validateGenomeDefinition", () => {
    it("rejects schema-invalid definitions", () => {
      const result = validateGenomeDefinition(cloneDefinition(missingMaxTurnsDefinition));

      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
      assert.deepEqual(result.issues, []);
    });

    it("rejects semantic-invalid definitions", () => {
      const result = validateGenomeDefinition(cloneDefinition(noMeaningfulActionsDefinition));

      assert.equal(result.valid, false);
      assert.deepEqual(result.errors, []);
      assert.ok(result.issues.length > 0);
    });
  });
});
