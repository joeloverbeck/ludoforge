import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGameDefinition } from "../../src/dsl/validate.js";
import { baseDefinition } from "./fixtures.mjs";

function compareErrors(left, right) {
  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }
  if (left.keyword !== right.keyword) {
    return left.keyword < right.keyword ? -1 : 1;
  }
  if (left.schemaPath !== right.schemaPath) {
    return left.schemaPath < right.schemaPath ? -1 : 1;
  }
  if (left.message !== right.message) {
    return left.message < right.message ? -1 : 1;
  }
  const leftParams = JSON.stringify(left.params);
  const rightParams = JSON.stringify(right.params);
  if (leftParams !== rightParams) {
    return leftParams < rightParams ? -1 : 1;
  }
  return 0;
}

test("validateGameDefinition returns valid true for a valid definition", () => {
  const result = validateGameDefinition(baseDefinition);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateGameDefinition returns sorted, structured errors", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.version;
  candidate.players.count = 0;

  const result = validateGameDefinition(candidate);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
  assert.ok(result.errors.some((error) => error.path === "/version"));

  const sorted = [...result.errors].sort(compareErrors);
  assert.deepEqual(result.errors, sorted);
});
