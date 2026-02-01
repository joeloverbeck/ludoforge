import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(terminationConditions) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "tally", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
      ],
      tokenTypes: [],
      zones: [],
    },
    actions: [
      {
        id: "bump",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "tally" }, amount: 1 },
        ],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: terminationConditions,
      maxTurns: 20,
    },
  };
}

function cmpCondition(varId, op, value) {
  return {
    kind: "cmp",
    op,
    left: { kind: "ref", ref: { kind: "var", id: varId } },
    right: { kind: "value", value },
  };
}

describe("semantic – termination overlap detection", () => {
  it("x >= 3 → win + x >= 5 → lose produces termination-overlap warning", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-overlap");

    assert.ok(match, "should detect overlapping terminations");
    assert.equal(match.severity, "warning");
  });

  it("x >= 3 → win + x <= 2 → lose does not overlap", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "<=", 2), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-overlap");

    assert.equal(match, undefined, "should not flag non-overlapping conditions");
  });

  it("same outcome does not produce overlap warning", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "win", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-overlap");

    assert.equal(match, undefined, "should not flag same-outcome overlaps");
  });

  it("different vars do not produce overlap", () => {
    const definition = {
      ...makeDefinition([]),
      state: {
        variables: [
          { id: "tally", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "health", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
        tokenTypes: [],
        zones: [],
      },
      actions: [
        {
          id: "bump",
          actor: "player",
          effects: [
            { kind: "inc", target: { kind: "var", id: "tally" }, amount: 1 },
            { kind: "inc", target: { kind: "var", id: "health" }, amount: 1 },
          ],
        },
      ],
      termination: {
        conditions: [
          { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
          { condition: cmpCondition("health", ">=", 5), outcome: { type: "lose", players: "active" } },
        ],
        maxTurns: 20,
      },
    };

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-overlap");

    assert.equal(match, undefined, "should not flag different-var conditions");
  });
});
