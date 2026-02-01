import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(overrides = {}) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
      ],
      tokenTypes: [
        { id: "pawn", attributes: [] },
        { id: "card", attributes: [] },
      ],
      zones: [
        { id: "board", tokenType: "pawn", scope: "global", order: "ordered", visibility: "public" },
        { id: "hand", tokenType: "card", scope: "per_player", order: "ordered", visibility: "private" },
      ],
    },
    actions: overrides.actions ?? [
      {
        id: "move",
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

describe("semantic – zone/token type compatibility", () => {
  it("matching zone/tokenType produces no zone-token-type-mismatch issue", () => {
    const definition = makeDefinition({
      actions: [
        {
          id: "place",
          actor: "player",
          effects: [
            { kind: "spawn", target: { kind: "token", id: "pawn" }, toZone: "board" },
          ],
        },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "zone-token-type-mismatch");

    assert.equal(match, undefined, "should not flag matching zone/tokenType");
  });

  it("mismatched spawn produces zone-token-type-mismatch warning", () => {
    const definition = makeDefinition({
      actions: [
        {
          id: "place",
          actor: "player",
          effects: [
            { kind: "spawn", target: { kind: "token", id: "card" }, toZone: "board" },
          ],
        },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "zone-token-type-mismatch");

    assert.ok(match, "should detect zone-token-type-mismatch");
    assert.equal(match.severity, "warning");
  });

  it("mismatched move produces zone-token-type-mismatch warning", () => {
    const definition = makeDefinition({
      actions: [
        {
          id: "transfer",
          actor: "player",
          effects: [
            { kind: "move", target: { kind: "token", id: "pawn" }, toZone: "hand" },
          ],
        },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "zone-token-type-mismatch");

    assert.ok(match, "should detect zone-token-type-mismatch for move");
    assert.equal(match.severity, "warning");
  });

  it("effect without toZone produces no issue", () => {
    const definition = makeDefinition({
      actions: [
        {
          id: "bump",
          actor: "player",
          effects: [
            { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
          ],
        },
      ],
    });

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "zone-token-type-mismatch");

    assert.equal(match, undefined, "should not flag effects without toZone");
  });
});
