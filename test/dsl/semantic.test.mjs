import { test } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues, validateSemanticDefinition } from "../../src/dsl/semantic.js";
import {
  baseDefinition,
  exampleDefinition,
  missingTerminationDefinition
} from "./fixtures.mjs";

function findRule(issues, rule) {
  return issues.some((issue) => issue.rule === rule);
}

test("collectSemanticIssues returns an empty list for valid definitions", () => {
  const issues = collectSemanticIssues(baseDefinition);
  assert.deepEqual(issues, []);
});

test("validateSemanticDefinition returns valid true for valid definitions", () => {
  const result = validateSemanticDefinition(baseDefinition);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("validateSemanticDefinition returns valid true for the minimal example", () => {
  const result = validateSemanticDefinition(exampleDefinition);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("collectSemanticIssues reports missing termination conditions", () => {
  const issues = collectSemanticIssues(missingTerminationDefinition);

  assert.ok(findRule(issues, "termination-conditions"));
});

test("collectSemanticIssues allows maxTurns without termination conditions", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.termination.conditions = [];
  candidate.termination.maxTurns = 10;

  const issues = collectSemanticIssues(candidate);

  assert.ok(!findRule(issues, "termination-conditions"));
});

test("collectSemanticIssues reports bad int bounds", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.state.variables[0].type.max;

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "int-bounds"));
});

test("collectSemanticIssues reports reference and usage violations", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.state.variables.push({
    id: "unused",
    scope: "global",
    type: { kind: "int", min: 0, max: 1 },
    initial: 0,
  });
  candidate.state.tokenTypes.push({
    id: "unusedToken",
    attributes: [
      {
        id: "flag",
        scope: "global",
        type: { kind: "bool" },
        initial: false,
      },
    ],
  });
  candidate.state.zones[0].tokenType = "missingToken";
  candidate.actions[0].effects[0].target = { kind: "var", id: "missingVar" };
  candidate.actions[0].targets[0].selector.zone = "missingZone";
  candidate.actions[0].targets[0].selector.tokenType = "missingTokenType";
  candidate.termination.conditions[0].condition.left = {
    kind: "ref",
    ref: { kind: "token", id: "pawn", attribute: "missingAttr" },
  };

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "ref-unknown"));
  assert.ok(findRule(issues, "zone-unknown"));
  assert.ok(findRule(issues, "token-type-unknown"));
  assert.ok(findRule(issues, "token-attribute-unknown"));
  assert.ok(findRule(issues, "unused-variable"));
  assert.ok(findRule(issues, "unused-token-type"));
});
