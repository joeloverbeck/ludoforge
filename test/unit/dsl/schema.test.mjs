import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import {
  baseDefinition,
  exampleDefinition,
  missingTerminationDefinition
} from "./fixtures.mjs";

const schemaJson = JSON.parse(
  await readFile(new URL("../../../schemas/dsl/game-definition.v1.json", import.meta.url))
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function assertValid(definition) {
  const ok = validate(definition);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(definition) {
  const ok = validate(definition);
  assert.equal(ok, false, "Expected schema validation to fail");
}

test("accepts a valid game definition", () => {
  assertValid(cloneDefinition(baseDefinition));
});

test("accepts the minimal example definition", () => {
  assertValid(cloneDefinition(exampleDefinition));
});

test("rejects missing version", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.version;
  assertInvalid(candidate);
});

test("rejects missing termination fixture", () => {
  assertInvalid(cloneDefinition(missingTerminationDefinition));
});

test("rejects invalid enum values", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.actions[0].actor = "npc";
  assertInvalid(candidate);
});

test("accepts meta refs in expressions", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.termination.conditions[0].condition = {
    kind: "cmp",
    op: "==",
    left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
    right: { kind: "value", value: 0 },
  };
  assertValid(candidate);
});

test("rejects invalid meta ids in expressions", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.termination.conditions[0].condition = {
    kind: "cmp",
    op: "==",
    left: { kind: "ref", ref: { kind: "meta", id: "unknownMeta" } },
    right: { kind: "value", value: 0 },
  };
  assertInvalid(candidate);
});

test("rejects meta refs as effect targets", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.actions[0].effects[0].target = { kind: "meta", id: "legalActionCount" };
  assertInvalid(candidate);
});

test("accepts noLegalActions terminate with defaultOutcome", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.turn.noLegalActions = {
    policy: "terminate",
    defaultOutcome: { type: "draw", players: "all" },
    reason: "no-legal-actions",
  };
  assertValid(candidate);
});

test("rejects noLegalActions terminate without defaultOutcome", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.turn.noLegalActions = { policy: "terminate" };
  assertInvalid(candidate);
});

test("rejects noLegalActions pass with defaultOutcome", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.turn.noLegalActions = {
    policy: "pass",
    defaultOutcome: { type: "draw", players: "all" },
  };
  assertInvalid(candidate);
});

test("rejects missing required state variables", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.state.variables;
  assertInvalid(candidate);
});

test("rejects player count below 1", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.players.count = 0;
  assertInvalid(candidate);
});
