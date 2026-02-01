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

describe("semantic – cancelling effect detection", () => {
  it("inc(x,5) + dec(x,5) produces cancelling-effects info", () => {
    const definition = makeDefinition([
      {
        id: "noop",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 5 },
          { kind: "dec", target: { kind: "var", id: "score" }, amount: 5 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "cancelling-effects");

    assert.ok(match, "should detect cancelling effects");
    assert.equal(match.severity, "info");
  });

  it("inc(x,3) + dec(x,5) does not produce cancelling-effects", () => {
    const definition = makeDefinition([
      {
        id: "unequal",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 3 },
          { kind: "dec", target: { kind: "var", id: "score" }, amount: 5 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "cancelling-effects");

    assert.equal(match, undefined, "should not flag unequal inc/dec");
  });

  it("two set(x) produces redundant-set-effect info", () => {
    const definition = makeDefinition([
      {
        id: "double-set",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "score" }, value: 3 },
          { kind: "set", target: { kind: "var", id: "score" }, value: 5 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "redundant-set-effect");

    assert.ok(match, "should detect redundant set effects");
    assert.equal(match.severity, "info");
  });

  it("inc-only does not produce cancelling-effects", () => {
    const definition = makeDefinition([
      {
        id: "inc-only",
        actor: "player",
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 2 },
        ],
      },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "cancelling-effects");

    assert.equal(match, undefined, "should not flag inc-only");
  });

  it("different vars do not cross-match", () => {
    const definition = {
      ...makeDefinition([]),
      state: {
        variables: [
          { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "health", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
        tokenTypes: [],
        zones: [],
      },
      actions: [
        {
          id: "mixed",
          actor: "player",
          effects: [
            { kind: "inc", target: { kind: "var", id: "score" }, amount: 5 },
            { kind: "dec", target: { kind: "var", id: "health" }, amount: 5 },
          ],
        },
      ],
    };

    const issues = collectSemanticIssues(definition);
    const match = issues.find((i) => i.rule === "cancelling-effects");

    assert.equal(match, undefined, "should not cross-match different vars");
  });
});
