import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGenomeId,
  serializeGenome,
  validateGenomeDefinition,
} from "../../src/evolutionary-engine/serialization.js";
import {
  baseDefinition,
  missingMaxTurnsDefinition,
  dominantActionDefinition,
} from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

test("serializeGenome is deterministic for identical definitions", () => {
  const definition = cloneDefinition(baseDefinition);
  const first = serializeGenome(definition);
  const second = serializeGenome(definition);

  assert.equal(first, second);
});

test("createGenomeId is stable across equivalent definitions", () => {
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

test("validateGenomeDefinition rejects schema-invalid definitions", () => {
  const result = validateGenomeDefinition(cloneDefinition(missingMaxTurnsDefinition));

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.deepEqual(result.issues, []);
});

test("validateGenomeDefinition rejects semantic-invalid definitions", () => {
  const result = validateGenomeDefinition(cloneDefinition(dominantActionDefinition));

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, []);
  assert.ok(result.issues.length > 0);
});

test("createGenomeId throws on invalid definitions", () => {
  assert.throws(() => createGenomeId(cloneDefinition(missingMaxTurnsDefinition)));
});
