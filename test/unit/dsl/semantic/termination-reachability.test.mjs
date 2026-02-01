import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function cmpCondition(varId, op, value) {
  return {
    kind: "cmp",
    op,
    left: { kind: "ref", ref: { kind: "var", id: varId } },
    right: { kind: "value", value },
  };
}

function makeDefinition({ actions, triggers, terminationConditions, variables }) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: variables ?? [
        { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        { id: "gauge", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
      ],
      tokenTypes: [],
      zones: [],
    },
    actions: actions ?? [
      {
        id: "bump",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ],
    triggers,
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: terminationConditions,
      maxTurns: 20,
    },
  };
}

describe("semantic – termination reachability", () => {
  it("termination on modified var produces no issue", () => {
    const definition = makeDefinition({
      terminationConditions: [
        { condition: cmpCondition("score", ">=", 10), outcome: { type: "win", players: "active" } },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-variable-unmodified");

    assert.equal(match, undefined, "should not flag modified var");
  });

  it("termination on unmodified var produces warning", () => {
    const definition = makeDefinition({
      terminationConditions: [
        { condition: cmpCondition("gauge", ">=", 3), outcome: { type: "win", players: "active" } },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-variable-unmodified");

    assert.ok(match, "should detect unmodified var in termination");
    assert.equal(match.severity, "warning");
  });

  it("var modified only by triggers produces no issue", () => {
    const definition = makeDefinition({
      triggers: [
        {
          event: "turn_start",
          effects: [
            { kind: "inc", target: { kind: "var", id: "gauge" }, amount: 1 },
          ],
        },
      ],
      terminationConditions: [
        { condition: cmpCondition("gauge", ">=", 3), outcome: { type: "win", players: "active" } },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-variable-unmodified");

    assert.equal(match, undefined, "should not flag var modified by trigger");
  });

  it("non-var condition is skipped", () => {
    const definition = makeDefinition({
      terminationConditions: [
        {
          condition: { kind: "value", value: true },
          outcome: { type: "draw", players: "all" },
        },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-variable-unmodified");

    assert.equal(match, undefined, "should skip non-cmp conditions");
  });
});
