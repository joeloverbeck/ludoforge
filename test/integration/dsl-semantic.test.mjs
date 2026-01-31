import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectSemanticIssues,
  validateSemanticDefinition,
} from "../../src/dsl/semantic.js";

function baseDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        {
          id: "score",
          scope: "global",
          type: { kind: "int", min: 0, max: 10 },
          initial: 0,
        },
      ],
      tokenTypes: [
        {
          id: "pawn",
          attributes: [
            {
              id: "owner",
              scope: "global",
              type: { kind: "enum", values: ["a", "b"] },
              initial: "a",
            },
          ],
        },
      ],
      zones: [
        {
          id: "board",
          tokenType: "pawn",
          scope: "global",
          order: "ordered",
          visibility: "public",
        },
      ],
    },
    actions: [
      {
        id: "move",
        actor: "player",
        effects: [
          {
            kind: "inc",
            target: { kind: "var", id: "score" },
            amount: 1,
          },
        ],
        params: [
          {
            id: "piece",
            kind: "token",
            domain: {
              selector: {
                zone: "board",
                tokenType: "pawn",
                count: 1,
              },
            },
          },
        ],
      },
    ],
    turn: {
      scheduler: "round_robin",
    },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: 10 },
          },
          outcome: {
            type: "win",
            players: "active",
          },
        },
      ],
      maxTurns: 20,
    },
  };
}

function hasRule(issues, rule) {
  return issues.some((issue) => issue.rule === rule);
}

function assertValidMatchesIssues(result) {
  const hasErrors = result.issues.some((issue) => issue.severity === "error");
  assert.equal(result.valid, !hasErrors);
}

function findIssue(issues, rule) {
  return issues.find((issue) => issue.rule === rule);
}

describe("dsl-semantic", () => {
  describe("bounds validation", () => {
    it("reports int bounds and initial bounds issues", () => {
      const definition = baseDefinition();
      delete definition.state.variables[0].type.max;
      definition.state.tokenTypes[0].attributes.push({
        id: "count",
        scope: "global",
        type: { kind: "int", min: 0, max: 1 },
        initial: 5,
      });

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      assert.ok(hasRule(result.issues, "int-bounds"));
      assert.ok(hasRule(result.issues, "int-initial-bounds"));
    });
  });

  describe("reference validation", () => {
    it("reports unknown refs and unused ids", () => {
      const definition = baseDefinition();
      definition.state.variables.push({
        id: "unusedVar",
        scope: "global",
        type: { kind: "int", min: 0, max: 1 },
        initial: 0,
      });
      definition.state.tokenTypes.push({
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
      definition.state.zones.push({
        id: "unusedZone",
        tokenType: "pawn",
        scope: "global",
        order: "ordered",
        visibility: "public",
      });
      definition.actions[0].effects.push({
        kind: "dec",
        target: { kind: "var", id: "missingVar" },
        amount: 1,
      });
      definition.actions[0].params.push({
        id: "ghost",
        kind: "token",
        domain: {
          selector: {
            zone: "missingZone",
            tokenType: "pawn",
            count: 1,
          },
        },
      });
      definition.actions[0].params.push({
        id: "wrongType",
        kind: "token",
        domain: {
          selector: {
            zone: "board",
            tokenType: "missingTokenType",
            count: 1,
          },
        },
      });
      definition.termination.conditions.push({
        condition: {
          kind: "cmp",
          op: "==",
          left: {
            kind: "ref",
            ref: { kind: "token", id: "pawn", attribute: "missingAttr" },
          },
          right: { kind: "value", value: 1 },
        },
        outcome: {
          type: "draw",
          players: "all",
        },
      });

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      assert.ok(hasRule(result.issues, "ref-unknown"));
      assert.ok(hasRule(result.issues, "zone-unknown"));
      assert.ok(hasRule(result.issues, "token-type-unknown"));
      assert.ok(hasRule(result.issues, "token-attribute-unknown"));
      assert.ok(hasRule(result.issues, "unused-variable"));
      assert.ok(hasRule(result.issues, "unused-token-type"));
      assert.ok(hasRule(result.issues, "unused-zone"));
    });
  });

  describe("meta refs", () => {
    it("allows known meta refs in expressions", () => {
      const definition = baseDefinition();
      definition.termination.conditions[0].condition = {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
        right: { kind: "value", value: 0 },
      };

      const issues = collectSemanticIssues(definition);

      assert.equal(hasRule(issues, "meta-ref-unknown"), false);
      assert.equal(hasRule(issues, "meta-ref-disallowed"), false);
    });

    it("rejects unknown meta refs in expressions", () => {
      const definition = baseDefinition();
      definition.termination.conditions[0].condition = {
        kind: "cmp",
        op: "==",
        left: { kind: "ref", ref: { kind: "meta", id: "badMeta" } },
        right: { kind: "value", value: 0 },
      };

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      assert.ok(hasRule(result.issues, "meta-ref-unknown"));
    });
  });

  describe("action validation", () => {
    it("reports unsatisfiable action preconditions", () => {
      const definition = baseDefinition();
      definition.state.variables[0].type = { kind: "int", min: 0, max: 1 };
      definition.actions[0].preconditions = {
        kind: "cmp",
        op: ">",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 5 },
      };
      definition.actions.push({
        id: "wait",
        actor: "player",
        effects: [],
        targets: [],
      });

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      const issue = findIssue(result.issues, "action-precondition-unsatisfiable");
      assert.ok(issue);
      assert.equal(issue.severity, "warning");
    });

    it("reports free-lunch actions", () => {
      const definition = baseDefinition();
      definition.actions = [
        {
          id: "free",
          actor: "player",
          effects: [
            {
              kind: "spawn",
              target: { kind: "token", id: "pawn" },
              toZone: "board",
            },
          ],
          targets: [],
          costs: [],
        },
      ];

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      const issue = findIssue(result.issues, "free-lunch");
      assert.ok(issue);
      assert.equal(issue.severity, "info");
    });

    it("reports dominant actions", () => {
      const definition = baseDefinition();
      definition.actions = [
        {
          id: "free",
          actor: "player",
          effects: [
            {
              kind: "spawn",
              target: { kind: "token", id: "pawn" },
              toZone: "board",
            },
          ],
          targets: [],
          costs: [],
        },
        {
          id: "limited",
          actor: "player",
          effects: [
            {
              kind: "inc",
              target: { kind: "var", id: "score" },
              amount: 1,
            },
          ],
          targets: [
            {
              id: "piece",
              kind: "token",
              selector: {
                zone: "board",
                tokenType: "pawn",
                count: 1,
              },
            },
          ],
        },
      ];

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      const issue = findIssue(result.issues, "dominant-action");
      assert.ok(issue);
      assert.equal(issue.severity, "info");
    });

    it("reports no meaningful actions", () => {
      const definition = baseDefinition();
      definition.actions = [];

      const result = validateSemanticDefinition(definition);

      assertValidMatchesIssues(result);
      assert.ok(hasRule(result.issues, "no-meaningful-actions"));
    });
  });

  describe("no-legal-actions policy", () => {
    it("enforces no-legal-actions defaultOutcome policy", () => {
      const missingOutcome = baseDefinition();
      missingOutcome.turn.noLegalActions = { policy: "terminate" };

      const extraOutcome = baseDefinition();
      extraOutcome.turn.noLegalActions = {
        policy: "pass",
        defaultOutcome: { type: "draw", players: "all" },
      };

      const resultMissing = validateSemanticDefinition(missingOutcome);
      const resultExtra = validateSemanticDefinition(extraOutcome);

      assertValidMatchesIssues(resultMissing);
      assertValidMatchesIssues(resultExtra);
      assert.ok(hasRule(resultMissing.issues, "no-legal-actions-default-outcome"));
      assert.ok(hasRule(resultExtra.issues, "no-legal-actions-default-outcome"));
    });
  });
});
