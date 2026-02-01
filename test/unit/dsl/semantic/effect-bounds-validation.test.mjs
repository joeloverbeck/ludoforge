import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(effects) {
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
        effects,
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

describe("semantic – effect bounds validation", () => {
  it("warns when set value is above variable max", () => {
    const definition = makeDefinition([
      { kind: "set", target: { kind: "var", id: "score" }, value: 99 },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "effect-value-out-of-bounds");

    assert.ok(match, "should produce effect-value-out-of-bounds warning");
    assert.equal(match.severity, "warning");
  });

  it("does not warn when set value is within bounds", () => {
    const definition = makeDefinition([
      { kind: "set", target: { kind: "var", id: "score" }, value: 5 },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "effect-value-out-of-bounds");

    assert.equal(match, undefined, "should not produce a warning for in-bounds value");
  });

  it("warns when inc amount exceeds variable range", () => {
    const definition = makeDefinition([
      { kind: "inc", target: { kind: "var", id: "score" }, amount: 15 },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "effect-amount-excessive");

    assert.ok(match, "should produce effect-amount-excessive warning");
    assert.equal(match.severity, "warning");
  });

  it("does not flag non-int variable effects", () => {
    const definition = {
      ...makeDefinition([
        { kind: "set", target: { kind: "var", id: "flag" }, value: true },
      ]),
    };
    definition.state.variables = [
      { id: "flag", scope: "global", type: { kind: "bool" }, initial: false },
    ];
    definition.termination.conditions[0].condition.left.ref.id = "flag";

    const issues = collectSemanticIssues(definition);
    const match = issues.find(
      (i) => i.rule === "effect-value-out-of-bounds" || i.rule === "effect-amount-excessive"
    );

    assert.equal(match, undefined, "should not flag non-int variables");
  });
});
