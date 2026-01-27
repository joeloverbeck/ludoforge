import { test } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues, validateSemanticDefinition } from "../../../src/dsl/semantic.js";
import {
  baseDefinition,
  dominantActionDefinition,
  exampleDefinition,
  missingTerminationDefinition,
  noMeaningfulActionsDefinition
} from "./fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function findRule(issues, rule) {
  return issues.some((issue) => issue.rule === rule);
}

test("collectSemanticIssues returns an empty list for valid definitions", () => {
  const issues = collectSemanticIssues(cloneDefinition(baseDefinition));
  assert.deepEqual(issues, []);
});

test("validateSemanticDefinition returns valid true for valid definitions", () => {
  const result = validateSemanticDefinition(cloneDefinition(baseDefinition));
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("validateSemanticDefinition returns valid true for the minimal example", () => {
  const result = validateSemanticDefinition(cloneDefinition(exampleDefinition));
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("collectSemanticIssues reports missing termination conditions", () => {
  const issues = collectSemanticIssues(cloneDefinition(missingTerminationDefinition));

  assert.ok(findRule(issues, "termination-conditions"));
});

test("collectSemanticIssues reports termination conditions even with maxTurns", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.termination.conditions = [];
  candidate.termination.maxTurns = 10;

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "termination-conditions"));
});

test("collectSemanticIssues reports missing maxTurns fallback", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.termination.maxTurns;

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "termination-max-turns"));
});

test("collectSemanticIssues reports bad int bounds", () => {
  const candidate = structuredClone(baseDefinition);
  delete candidate.state.variables[0].type.max;

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "int-bounds"));
});

test("collectSemanticIssues reports out-of-bounds int initial values", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.state.variables[0].initial = 99;
  candidate.state.tokenTypes[0].attributes = [
    {
      id: "count",
      scope: "global",
      type: { kind: "int", min: 0, max: 2 },
      initial: 5,
    },
  ];

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "int-initial-bounds"));
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

test("collectSemanticIssues reports unused zones", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.state.zones.push({
    id: "unusedZone",
    tokenType: "pawn",
    scope: "global",
    order: "ordered",
    visibility: "public",
  });

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "unused-zone"));
});

test("collectSemanticIssues reports free lunch actions", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.actions[0].targets = [];
  delete candidate.actions[0].preconditions;
  candidate.actions[0].costs = [];
  candidate.actions[0].effects = [
    {
      kind: "spawn",
      target: { kind: "token", id: "pawn" },
      toZone: "board",
    },
  ];

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "free-lunch"));
});

test("collectSemanticIssues allows beneficial actions with costs", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.actions[0].targets = [];
  delete candidate.actions[0].preconditions;
  candidate.actions[0].effects = [
    {
      kind: "spawn",
      target: { kind: "token", id: "pawn" },
      toZone: "board",
    },
  ];
  candidate.actions[0].costs = [
    {
      kind: "dec",
      target: { kind: "var", id: "score" },
      amount: 1,
    },
  ];

  const issues = collectSemanticIssues(candidate);

  assert.equal(findRule(issues, "free-lunch"), false);
});

test("collectSemanticIssues reports unsatisfiable action preconditions", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.actions[0].preconditions = { kind: "value", value: false };

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "action-precondition-unsatisfiable"));
});

test("collectSemanticIssues reports unsatisfiable comparisons against bounds", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.state.variables[0].type = { kind: "int", min: 0, max: 3 };
  candidate.actions[0].preconditions = {
    kind: "cmp",
    op: ">",
    left: { kind: "ref", ref: { kind: "var", id: "score" } },
    right: { kind: "value", value: 5 },
  };

  const issues = collectSemanticIssues(candidate);

  assert.ok(findRule(issues, "action-precondition-unsatisfiable"));
});

test("collectSemanticIssues allows satisfiable comparisons within bounds", () => {
  const candidate = structuredClone(baseDefinition);
  candidate.state.variables[0].type = { kind: "int", min: 0, max: 3 };
  candidate.actions[0].preconditions = {
    kind: "cmp",
    op: ">=",
    left: { kind: "ref", ref: { kind: "var", id: "score" } },
    right: { kind: "value", value: 0 },
  };

  const issues = collectSemanticIssues(candidate);

  assert.equal(findRule(issues, "action-precondition-unsatisfiable"), false);
});

test("collectSemanticIssues reports dominant actions", () => {
  const issues = collectSemanticIssues(cloneDefinition(dominantActionDefinition));

  assert.ok(findRule(issues, "dominant-action"));
});

test("collectSemanticIssues reports no meaningful actions when all are unsatisfiable", () => {
  const issues = collectSemanticIssues(cloneDefinition(noMeaningfulActionsDefinition));

  assert.ok(findRule(issues, "no-meaningful-actions"));
});
