import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(actions) {
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
    actions,
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: 10 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 20,
    },
  };
}

describe("semantic – duplicate action detection", () => {
  it("detects two identical actions with different IDs", () => {
    const sharedBody = {
      actor: "player",
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    };
    const definition = makeDefinition([
      { id: "move-a", ...sharedBody },
      { id: "move-b", ...sharedBody },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "duplicate-action");

    assert.ok(match, "should detect duplicate action");
    assert.equal(match.severity, "info");
  });

  it("does not flag different actions", () => {
    const definition = makeDefinition([
      {
        id: "inc-action",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
      {
        id: "dec-action",
        actor: "player",
        effects: [
          { kind: "dec", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "duplicate-action");

    assert.equal(match, undefined, "should not flag different actions");
  });
});
