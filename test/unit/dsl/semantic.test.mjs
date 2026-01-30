import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues, validateSemanticDefinition } from "../../../src/dsl/semantic.js";
import {
  baseDefinition,
  dominantActionDefinition,
  exampleDefinition,
  missingTerminationConditionsDefinition,
  missingTerminationDefinition,
  noMeaningfulActionsDefinition
} from "./fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function findRule(issues, rule) {
  return issues.some((issue) => issue.rule === rule);
}

function findIssue(issues, rule) {
  return issues.find((issue) => issue.rule === rule);
}

describe("semantic", () => {
  describe("validateSemanticDefinition", () => {
    it("returns valid true for valid definitions", () => {
      const result = validateSemanticDefinition(cloneDefinition(baseDefinition));
      assert.equal(result.valid, true);
      assert.deepEqual(result.issues, []);
    });

    it("returns valid true for the minimal example", () => {
      const result = validateSemanticDefinition(cloneDefinition(exampleDefinition));
      assert.equal(result.valid, true);
      assert.deepEqual(result.issues, []);
    });

    it("returns valid false when no meaningful actions exist", () => {
      const result = validateSemanticDefinition(cloneDefinition(noMeaningfulActionsDefinition));

      const issue = findIssue(result.issues, "no-meaningful-actions");
      assert.equal(result.valid, false);
      assert.ok(issue);
      assert.equal(issue.severity, "error");
    });

    it("returns valid false for missing termination conditions", () => {
      const result = validateSemanticDefinition(
        cloneDefinition(missingTerminationConditionsDefinition)
      );

      const issue = findIssue(result.issues, "termination-conditions");
      assert.equal(result.valid, false);
      assert.ok(issue);
      assert.equal(issue.severity, "error");
    });

    it("returns valid false for termination conditions with unknown refs", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.termination.conditions[0].condition.left = {
        kind: "ref",
        ref: { kind: "var", id: "missingVar" },
      };

      const result = validateSemanticDefinition(candidate);
      const issue = findIssue(result.issues, "ref-unknown");

      assert.equal(result.valid, false);
      assert.ok(issue);
      assert.equal(issue.severity, "error");
    });

    it("returns valid true when only unused variables are present", () => {
      const candidate = structuredClone(baseDefinition);
      candidate.state.variables.push({
        id: "unusedVar",
        scope: "global",
        type: { kind: "int", min: 0, max: 1 },
        initial: 0,
      });

      const result = validateSemanticDefinition(candidate);
      const issue = findIssue(result.issues, "unused-variable");

      assert.equal(result.valid, true);
      assert.ok(issue);
      assert.equal(issue.severity, "warning");
    });
  });

  describe("collectSemanticIssues", () => {
    it("returns an empty list for valid definitions", () => {
      const issues = collectSemanticIssues(cloneDefinition(baseDefinition));
      assert.deepEqual(issues, []);
    });

    describe("termination rules", () => {
      it("reports missing termination conditions", () => {
        const issues = collectSemanticIssues(cloneDefinition(missingTerminationDefinition));

        assert.ok(findRule(issues, "termination-conditions"));
      });

      it("reports termination conditions even with maxTurns", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.termination.conditions = [];
        candidate.termination.maxTurns = 10;

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "termination-conditions"));
      });

      it("reports missing maxTurns fallback", () => {
        const candidate = structuredClone(baseDefinition);
        delete candidate.termination.maxTurns;

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "termination-max-turns"));
      });
    });

    describe("meta refs", () => {
      it("allows valid meta refs in expressions", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.termination.conditions[0].condition = {
          kind: "cmp",
          op: "==",
          left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
          right: { kind: "value", value: 0 },
        };

        const issues = collectSemanticIssues(candidate);

        assert.equal(findRule(issues, "meta-ref-unknown"), false);
        assert.equal(findRule(issues, "meta-ref-disallowed"), false);
      });

      it("reports unknown meta ids", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.termination.conditions[0].condition = {
          kind: "cmp",
          op: "==",
          left: { kind: "ref", ref: { kind: "meta", id: "badMeta" } },
          right: { kind: "value", value: 0 },
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "meta-ref-unknown"));
      });

      it("rejects meta refs outside expressions", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects.push({
          kind: "inc",
          target: { kind: "meta", id: "legalActionCount" },
          amount: 1,
        });

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "meta-ref-disallowed"));
      });
    });

    describe("noLegalActions", () => {
      it("reports missing noLegalActions defaultOutcome", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn.noLegalActions = { policy: "terminate" };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "no-legal-actions-default-outcome"));
      });

      it("reports extra noLegalActions defaultOutcome", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn.noLegalActions = {
          policy: "pass",
          defaultOutcome: { type: "draw", players: "all" },
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "no-legal-actions-default-outcome"));
      });
    });

    describe("int variable rules", () => {
      it("reports bad int bounds", () => {
        const candidate = structuredClone(baseDefinition);
        delete candidate.state.variables[0].type.max;

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "int-bounds"));
      });

      it("reports non-numeric int initial values", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.state.variables[0].initial = "not-a-number";

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "int-initial-type"));
      });

      it("reports out-of-bounds int initial values", () => {
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
    });

    describe("reference and usage violations", () => {
      it("reports reference and usage violations", () => {
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

      it("reports unused zones", () => {
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
    });

    describe("scheduler validation", () => {
      it("reports priority_queue with orderBy referencing non-existent variable", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "priority_queue",
          orderBy: { variable: "nonExistentVar", direction: "asc" },
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "ref-unknown"));
        const issue = findIssue(issues, "ref-unknown");
        assert.ok(issue.path.includes("/turn/orderBy/variable"));
      });

      it("allows priority_queue with valid orderBy variable", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "priority_queue",
          orderBy: { variable: "score", direction: "asc" },
        };

        const issues = collectSemanticIssues(candidate);

        const schedulerIssues = issues.filter((i) =>
          i.path.startsWith("/turn/orderBy")
        );
        assert.deepEqual(schedulerIssues, []);
      });

      it("reports token_holder with non-existent token type", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "token_holder",
          tokenType: "nonExistentToken",
          zone: "board",
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "token-type-unknown"));
        const issue = findIssue(issues, "token-type-unknown");
        assert.ok(issue.path.includes("/turn/tokenType"));
      });

      it("reports token_holder with non-existent zone", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "token_holder",
          tokenType: "pawn",
          zone: "nonExistentZone",
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "zone-unknown"));
        const issue = findIssue(issues, "zone-unknown");
        assert.ok(issue.path.includes("/turn/zone"));
      });

      it("allows token_holder with valid tokenType and zone", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "token_holder",
          tokenType: "pawn",
          zone: "board",
        };

        const issues = collectSemanticIssues(candidate);

        const schedulerIssues = issues.filter(
          (i) =>
            i.path.startsWith("/turn/tokenType") ||
            i.path.startsWith("/turn/zone")
        );
        assert.deepEqual(schedulerIssues, []);
      });

      it("allows simultaneous scheduler with resolution order", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "simultaneous",
          resolution: { order: "by_player_id" },
        };

        const issues = collectSemanticIssues(candidate);

        assert.equal(findRule(issues, "turn-resolution-order"), false);
      });

      it("reports simultaneous scheduler with invalid resolution order", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "simultaneous",
          resolution: { order: "clockwise" },
        };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "turn-resolution-order"));
      });
    });

    describe("conditional effect validation", () => {
      it("reports unknown variable refs inside conditional then branch", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 1 },
            },
            then: [
              {
                kind: "inc",
                target: { kind: "var", id: "nonExistentVar" },
                amount: 1,
              },
            ],
          },
        ];

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "ref-unknown"));
      });

      it("reports unknown variable refs inside conditional else branch", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 1 },
            },
            then: [
              {
                kind: "inc",
                target: { kind: "var", id: "score" },
                amount: 1,
              },
            ],
            else: [
              {
                kind: "dec",
                target: { kind: "var", id: "missingElseVar" },
                amount: 1,
              },
            ],
          },
        ];

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "ref-unknown"));
      });

      it("reports unknown variable refs in conditional condition", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "badCondVar" } },
              right: { kind: "value", value: 1 },
            },
            then: [
              {
                kind: "inc",
                target: { kind: "var", id: "score" },
                amount: 1,
              },
            ],
          },
        ];

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "ref-unknown"));
      });

      it("allows conditional effect with empty then array", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 1 },
            },
            then: [],
          },
        ];

        const issues = collectSemanticIssues(candidate);

        const conditionalIssues = issues.filter(
          (i) => i.rule !== "free-lunch" && i.rule !== "unused-token-type"
        );
        assert.deepEqual(conditionalIssues, []);
      });

      it("allows valid conditional effect with all refs correct", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 1 },
            },
            then: [
              {
                kind: "inc",
                target: { kind: "var", id: "score" },
                amount: 1,
              },
            ],
            else: [
              {
                kind: "dec",
                target: { kind: "var", id: "score" },
                amount: 1,
              },
            ],
          },
        ];

        const issues = collectSemanticIssues(candidate);

        const refIssues = issues.filter((i) => i.rule === "ref-unknown");
        assert.deepEqual(refIssues, []);
      });
    });

    describe("move.toPlayer validation", () => {
      it("reports move.toPlayer used with a global zone", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].effects = [
          {
            kind: "move",
            target: { kind: "token", id: "pawn" },
            toZone: "board",
            toPlayer: "opponent",
          },
        ];

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "move-to-player-scope"));
      });

      it("allows move.toPlayer with a per_player zone", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.state.zones.push({
          id: "hand",
          tokenType: "pawn",
          scope: "per_player",
          order: "ordered",
          visibility: "private",
        });
        candidate.actions[0].effects = [
          {
            kind: "move",
            target: { kind: "token", id: "pawn" },
            toZone: "hand",
            toPlayer: "opponent",
          },
        ];

        const issues = collectSemanticIssues(candidate);

        assert.equal(findRule(issues, "move-to-player-scope"), false);
      });
    });

    describe("valid definitions with new primitives", () => {
      it("passes validation with priority_queue, conditional, and start_round trigger", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.state.variables.push({
          id: "time_pos",
          scope: "per_player",
          type: { kind: "int", min: 0, max: 100 },
          initial: 0,
        });
        candidate.turn = {
          scheduler: "priority_queue",
          orderBy: { variable: "time_pos", direction: "asc" },
        };
        candidate.triggers = [
          {
            event: "start_round",
            effects: [
              {
                kind: "set",
                target: { kind: "var", id: "time_pos" },
                value: 0,
              },
            ],
          },
        ];
        candidate.actions[0].effects = [
          {
            kind: "conditional",
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 5 },
            },
            then: [
              {
                kind: "inc",
                target: { kind: "var", id: "score" },
                amount: 2,
              },
            ],
            else: [
              {
                kind: "inc",
                target: { kind: "var", id: "score" },
                amount: 1,
              },
            ],
          },
        ];

        const result = validateSemanticDefinition(candidate);

        assert.equal(result.valid, true);
      });

      it("passes validation with token_holder scheduler", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.turn = {
          scheduler: "token_holder",
          tokenType: "pawn",
          zone: "board",
        };

        const result = validateSemanticDefinition(candidate);

        assert.equal(result.valid, true);
      });

      it("passes validation with end_round trigger and move.toPlayer on per_player zone", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.state.zones.push({
          id: "player_hand",
          tokenType: "pawn",
          scope: "per_player",
          order: "ordered",
          visibility: "private",
        });
        candidate.triggers = [
          {
            event: "end_round",
            effects: [
              {
                kind: "move",
                target: { kind: "token", id: "pawn" },
                toZone: "player_hand",
                toPlayer: "next",
              },
            ],
          },
        ];

        const result = validateSemanticDefinition(candidate);

        assert.equal(result.valid, true);
      });
    });

    describe("action rules", () => {
      it("reports free lunch actions", () => {
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

      it("allows beneficial actions with costs", () => {
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

      it("reports unsatisfiable action preconditions", () => {
        const candidate = structuredClone(baseDefinition);
        candidate.actions[0].preconditions = { kind: "value", value: false };

        const issues = collectSemanticIssues(candidate);

        assert.ok(findRule(issues, "action-precondition-unsatisfiable"));
      });

      it("reports unsatisfiable comparisons against bounds", () => {
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

      it("allows satisfiable comparisons within bounds", () => {
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

      it("reports dominant actions", () => {
        const issues = collectSemanticIssues(cloneDefinition(dominantActionDefinition));

        assert.ok(findRule(issues, "dominant-action"));
      });

      it("reports no meaningful actions when all are unsatisfiable", () => {
        const issues = collectSemanticIssues(cloneDefinition(noMeaningfulActionsDefinition));

        assert.ok(findRule(issues, "no-meaningful-actions"));
      });
    });
  });
});
