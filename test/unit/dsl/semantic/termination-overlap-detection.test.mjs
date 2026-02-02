import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSemanticIssues } from "../../../../src/dsl/semantic.js";

function makeDefinition(terminationConditions, { variables, actions } = {}) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: variables ?? [
        { id: "tally", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
      ],
      tokenTypes: [],
      zones: [],
    },
    actions: actions ?? [
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

function hasOverlap(issues) {
  return issues.find((i) => i.rule === "termination-overlap");
}

// ─── Bounded variable tests (original brute-force path) ───

describe("semantic – termination overlap detection (bounded)", () => {
  it("x >= 3 → win + x >= 5 → lose produces termination-overlap warning", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    const match = hasOverlap(issues);

    assert.ok(match, "should detect overlapping terminations");
    assert.equal(match.severity, "warning");
  });

  it("x >= 3 → win + x <= 2 → lose does not overlap", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "<=", 2), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "should not flag non-overlapping conditions");
  });

  it("same outcome does not produce overlap warning", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "win", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "should not flag same-outcome overlaps");
  });

  it("different vars do not produce overlap", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("health", ">=", 5), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "tally", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "health", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
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
      },
    );

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "should not flag different-var conditions");
  });

  it("x > 5 → win + x < 6 → lose does not overlap (adjacent integers)", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "<", 6), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "x>5 means x>=6, x<6 means x<=5, no overlap");
  });

  it("x > 4 → win + x < 7 → lose overlaps on {5, 6}", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">", 4), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "<", 7), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "should detect overlap on 5 and 6");
  });

  it("x == 5 → win + x == 5 → lose overlaps", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "==", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "same value with different outcomes overlaps");
  });

  it("x == 5 → win + x == 6 → lose does not overlap", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", "==", 6), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "different exact values do not overlap");
  });

  it("single condition never produces overlap", () => {
    const definition = makeDefinition([
      { condition: cmpCondition("tally", ">=", 3), outcome: { type: "win", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "need at least 2 conditions to overlap");
  });
});

// ─── Unbounded variable tests (the root cause of the hang) ───

describe("semantic – termination overlap detection (unbounded variables)", () => {
  it("completes without hanging when variable has no bounds (min/max missing)", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("score", ">=", 10), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("score", ">=", 20), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "score", scope: "global", type: { kind: "int" }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "unbounded >= 10 and >= 20 overlap");
  });

  it("completes without hanging when variable has Infinity max", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("score", ">=", 5), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("score", "<=", 3), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "score", scope: "global", type: { kind: "int", min: 0 }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, ">= 5 and <= 3 do not overlap");
  });

  it("completes without hanging when variable has -Infinity min", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("score", "<", 0), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("score", ">", 10), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "score", scope: "global", type: { kind: "int", max: 100 }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "< 0 and > 10 do not overlap");
  });

  it("completes without hanging when variable type is not int (no kind)", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("score", ">=", 5), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("score", ">=", 8), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "score", scope: "global", type: { kind: "real" }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            ],
          },
        ],
      },
    );

    // Non-int types fall back to -Infinity/Infinity bounds → algebraic path
    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), ">= 5 and >= 8 overlap algebraically");
  });

  it("completes without hanging when variable is not in variableById map", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("mystery", ">=", 5), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("mystery", ">=", 8), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "tally", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "tally" }, amount: 1 },
            ],
          },
        ],
      },
    );

    // "mystery" is not in variables, so variableById.get returns undefined → -Infinity/Infinity
    const issues = collectSemanticIssues(definition);
    // The ref-unknown errors will fire, but overlap detection should not hang
    assert.ok(true, "completed without hanging");
  });

  it("completes within 100ms for fully unbounded variable", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("score", ">=", 100), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("score", "<=", 50), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "score", scope: "global", type: { kind: "int" }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const start = Date.now();
    collectSemanticIssues(definition);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `should complete quickly but took ${elapsed}ms`);
  });
});

// ─── Algebraic fallback correctness ───

describe("semantic – termination overlap algebraic fallback", () => {
  // All tests here use unbounded variables to force the algebraic path

  function makeUnbounded(conditions) {
    return makeDefinition(conditions, {
      variables: [
        { id: "v", scope: "global", type: { kind: "int" }, initial: 0 },
      ],
      actions: [
        {
          id: "bump",
          actor: "player",
          effects: [
            { kind: "inc", target: { kind: "var", id: "v" }, amount: 1 },
          ],
        },
      ],
    });
  }

  it(">= 5 and <= 10 overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", ">=", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "<=", 10), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), ">= 5 and <= 10 overlap on 5..10");
  });

  it(">= 10 and <= 5 do not overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", ">=", 10), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "<=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, ">= 10 and <= 5 cannot both be true");
  });

  it("> 5 and < 6 do not overlap (algebraic, adjacent integers)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", ">", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "<", 6), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "> 5 means >= 6, < 6 means <= 5, no overlap");
  });

  it("> 5 and < 8 overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", ">", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "<", 8), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "> 5 and < 8 overlap on {6, 7}");
  });

  it("== 5 and == 5 overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "==", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "same exact value overlaps");
  });

  it("== 5 and == 6 do not overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", "==", 6), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "different exact values do not overlap");
  });

  it(">= 5 and >= 5 overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", ">=", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "identical conditions with different outcomes overlap");
  });

  it("<= 5 and >= 5 overlap on exactly 5 (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "<=", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "<= 5 and >= 5 overlap on exactly 5");
  });

  it("< 5 and > 5 do not overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "<", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", ">", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "< 5 means <= 4, > 5 means >= 6, no overlap");
  });

  it("== 5 and >= 5 overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), "== 5 is within >= 5");
  });

  it("== 5 and > 5 do not overlap (algebraic)", () => {
    const definition = makeUnbounded([
      { condition: cmpCondition("v", "==", 5), outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("v", ">", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "== 5 and > 5 (>= 6) do not overlap");
  });
});

// ─── Large bounded range tests ───

describe("semantic – termination overlap detection (large ranges)", () => {
  it("completes quickly for variable with range exceeding MAX_RANGE", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("big", ">=", 50000), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("big", "<=", 30000), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "big", scope: "global", type: { kind: "int", min: 0, max: 100000 }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "big" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const start = Date.now();
    const issues = collectSemanticIssues(definition);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `should use algebraic path and complete quickly but took ${elapsed}ms`);
    assert.equal(hasOverlap(issues), undefined, ">= 50000 and <= 30000 do not overlap");
  });

  it("detects overlap for large-range variable", () => {
    const definition = makeDefinition(
      [
        { condition: cmpCondition("big", ">=", 1000), outcome: { type: "win", players: "active" } },
        { condition: cmpCondition("big", ">=", 2000), outcome: { type: "lose", players: "active" } },
      ],
      {
        variables: [
          { id: "big", scope: "global", type: { kind: "int", min: 0, max: 100000 }, initial: 0 },
        ],
        actions: [
          {
            id: "bump",
            actor: "player",
            effects: [
              { kind: "inc", target: { kind: "var", id: "big" }, amount: 1 },
            ],
          },
        ],
      },
    );

    const issues = collectSemanticIssues(definition);
    assert.ok(hasOverlap(issues), ">= 1000 and >= 2000 overlap on 2000+");
  });
});

// ─── Edge cases ───

describe("semantic – termination overlap edge cases", () => {
  it("non-cmp conditions are ignored", () => {
    const definition = makeDefinition([
      { condition: { kind: "expr", expr: { kind: "value", value: true } }, outcome: { type: "win", players: "active" } },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "non-cmp condition is skipped");
  });

  it("condition with non-numeric right side is ignored", () => {
    const definition = makeDefinition([
      {
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "tally" } },
          right: { kind: "ref", ref: { kind: "var", id: "tally" } },
        },
        outcome: { type: "win", players: "active" },
      },
      { condition: cmpCondition("tally", ">=", 5), outcome: { type: "lose", players: "active" } },
    ]);

    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined, "ref-vs-ref condition is skipped");
  });

  it("empty conditions array does not crash", () => {
    const definition = makeDefinition([]);
    const issues = collectSemanticIssues(definition);
    assert.equal(hasOverlap(issues), undefined);
  });
});
