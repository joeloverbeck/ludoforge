import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(threshold, op = ">=") {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
      ],
      tokenTypes: [],
      zones: [],
    },
    actions: [
      {
        id: "act",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op,
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: threshold },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 20,
    },
  };
}

describe("semantic – termination threshold validation", () => {
  it("warns when threshold is above variable max", () => {
    const issues = collectSemanticIssues(makeDefinition(20));
    const match = issues.find((i) => i.rule === "termination-threshold-out-of-bounds");

    assert.ok(match, "should produce termination-threshold-out-of-bounds warning");
    assert.equal(match.severity, "warning");
  });

  it("warns when threshold is below variable min", () => {
    const issues = collectSemanticIssues(makeDefinition(-5, "<="));
    const match = issues.find((i) => i.rule === "termination-threshold-out-of-bounds");

    assert.ok(match, "should produce termination-threshold-out-of-bounds warning");
  });

  it("does not warn when threshold is within bounds", () => {
    const issues = collectSemanticIssues(makeDefinition(10));
    const match = issues.find((i) => i.rule === "termination-threshold-out-of-bounds");

    assert.equal(match, undefined, "should not warn for in-bounds threshold");
  });

  it("warns when condition is immediately true", () => {
    const definition = makeDefinition(0, ">=");
    // initial=0, threshold=0 with >=  → immediately true
    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "termination-immediately-true");

    assert.ok(match, "should produce termination-immediately-true warning");
    assert.equal(match.severity, "warning");
  });
});
