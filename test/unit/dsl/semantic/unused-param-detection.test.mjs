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
      tokenTypes: [
        { id: "pawn", attributes: [] },
      ],
      zones: [
        { id: "board", tokenType: "pawn", scope: "global", order: "ordered", visibility: "public" },
      ],
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

describe("semantic – unused action param detection", () => {
  it("referenced param produces no issue", () => {
    const definition = makeDefinition([
      {
        id: "move",
        actor: "player",
        params: [
          { id: "pawn", kind: "token", domain: { selector: { zone: "board", tokenType: "pawn", count: 1 } } },
        ],
        effects: [
          { kind: "move", target: { kind: "token", id: "pawn" }, toZone: "board" },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "unused-action-param");

    assert.equal(match, undefined, "should not flag referenced param");
  });

  it("unreferenced param produces unused-action-param info", () => {
    const definition = makeDefinition([
      {
        id: "move",
        actor: "player",
        params: [
          { id: "piece", kind: "token", domain: { selector: { zone: "board", tokenType: "pawn", count: 1 } } },
        ],
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "unused-action-param");

    assert.ok(match, "should detect unused param");
    assert.equal(match.severity, "warning");
  });

  it("no params produces no issue", () => {
    const definition = makeDefinition([
      {
        id: "bump",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "unused-action-param");

    assert.equal(match, undefined, "should not flag action without params");
  });

  it("param in nested conditional produces no issue", () => {
    const definition = makeDefinition([
      {
        id: "cond-move",
        actor: "player",
        params: [
          { id: "pawn", kind: "token", domain: { selector: { zone: "board", tokenType: "pawn", count: 1 } } },
        ],
        effects: [
          {
            kind: "conditional",
            condition: { kind: "value", value: true },
            then: [
              { kind: "move", target: { kind: "token", id: "pawn" }, toZone: "board" },
            ],
          },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "unused-action-param");

    assert.equal(match, undefined, "should not flag param used in nested conditional");
  });
});
