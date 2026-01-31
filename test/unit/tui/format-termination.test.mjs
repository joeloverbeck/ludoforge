import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatExpr,
  formatTerminationConditions,
} from "../../../src/tui/utils/format-termination.js";

describe("formatExpr", () => {
  it("formats a value (number)", () => {
    assert.strictEqual(formatExpr({ kind: "value", value: 42 }), "42");
  });

  it("formats a value (boolean)", () => {
    assert.strictEqual(formatExpr({ kind: "value", value: true }), "true");
  });

  it("formats a value (string)", () => {
    assert.strictEqual(formatExpr({ kind: "value", value: "hello" }), "hello");
  });

  it("formats a ref (var)", () => {
    assert.strictEqual(
      formatExpr({ kind: "ref", ref: { kind: "var", id: "score" } }),
      "score",
    );
  });

  it("formats a ref with attribute", () => {
    assert.strictEqual(
      formatExpr({ kind: "ref", ref: { kind: "token", id: "pawn", attribute: "count" } }),
      "pawn.count",
    );
  });

  it("formats a meta ref", () => {
    assert.strictEqual(
      formatExpr({ kind: "ref", ref: { kind: "meta", id: "turnNumber" } }),
      "turnNumber",
    );
  });

  it("formats a cmp expression", () => {
    const expr = {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "score" } },
      right: { kind: "value", value: 3 },
    };
    assert.strictEqual(formatExpr(expr), "score >= 3");
  });

  it("formats an and expression", () => {
    const expr = {
      kind: "and",
      left: { kind: "value", value: "A" },
      right: { kind: "value", value: "B" },
    };
    assert.strictEqual(formatExpr(expr), "(A AND B)");
  });

  it("formats an or expression", () => {
    const expr = {
      kind: "or",
      left: { kind: "value", value: "X" },
      right: { kind: "value", value: "Y" },
    };
    assert.strictEqual(formatExpr(expr), "(X OR Y)");
  });

  it("formats a not expression", () => {
    const expr = {
      kind: "not",
      value: { kind: "value", value: "Z" },
    };
    assert.strictEqual(formatExpr(expr), "NOT (Z)");
  });

  it("formats an arith expression", () => {
    const expr = {
      kind: "arith",
      op: "+",
      left: { kind: "value", value: 1 },
      right: { kind: "value", value: 2 },
    };
    assert.strictEqual(formatExpr(expr), "(1 + 2)");
  });

  it("formats nested expressions", () => {
    const expr = {
      kind: "cmp",
      op: ">",
      left: {
        kind: "arith",
        op: "*",
        left: { kind: "ref", ref: { kind: "var", id: "hp" } },
        right: { kind: "value", value: 2 },
      },
      right: { kind: "value", value: 10 },
    };
    assert.strictEqual(formatExpr(expr), "(hp * 2) > 10");
  });

  it("returns <?> for unknown kind", () => {
    assert.strictEqual(formatExpr({ kind: "unknown_xyz" }), "<?>");
  });

  it("returns <?> for null/undefined", () => {
    assert.strictEqual(formatExpr(null), "<?>");
    assert.strictEqual(formatExpr(undefined), "<?>");
  });
});

describe("formatTerminationConditions", () => {
  it("returns [] for null", () => {
    assert.deepStrictEqual(formatTerminationConditions(null), []);
  });

  it("returns [] for undefined", () => {
    assert.deepStrictEqual(formatTerminationConditions(undefined), []);
  });

  it("formats a single win/active condition", () => {
    const termination = {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: 3 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "score >= 3 → active player wins",
    ]);
  });

  it("formats a single lose/active condition", () => {
    const termination = {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "==",
            left: { kind: "ref", ref: { kind: "var", id: "health" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "health == 0 → active player loses",
    ]);
  });

  it("formats multiple conditions", () => {
    const termination = {
      conditions: [
        {
          condition: { kind: "value", value: "A" },
          outcome: { type: "win", players: "active" },
        },
        {
          condition: { kind: "value", value: "B" },
          outcome: { type: "draw" },
        },
      ],
    };
    const lines = formatTerminationConditions(termination);
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], "A → active player wins");
    assert.strictEqual(lines[1], "B → draw");
  });

  it("appends maxTurns line", () => {
    const termination = { conditions: [], maxTurns: 10 };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "Max 10 turns (draw)",
    ]);
  });

  it("appends scoring line", () => {
    const termination = {
      conditions: [],
      scoring: {
        perPlayer: { kind: "ref", ref: { kind: "var", id: "health" } },
      },
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "Scoring: health per player",
    ]);
  });

  it("formats a full termination block", () => {
    const termination = {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "==",
            left: { kind: "ref", ref: { kind: "var", id: "health" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
      maxTurns: 10,
      scoring: {
        perPlayer: { kind: "ref", ref: { kind: "var", id: "health" } },
      },
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "health == 0 → active player loses",
      "Max 10 turns (draw)",
      "Scoring: health per player",
    ]);
  });

  it("handles empty conditions with only maxTurns", () => {
    const termination = { conditions: [], maxTurns: 20 };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "Max 20 turns (draw)",
    ]);
  });

  it("formats draw outcome", () => {
    const termination = {
      conditions: [
        {
          condition: { kind: "value", value: "X" },
          outcome: { type: "draw" },
        },
      ],
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "X → draw",
    ]);
  });

  it("formats win/all outcome", () => {
    const termination = {
      conditions: [
        {
          condition: { kind: "value", value: "Y" },
          outcome: { type: "win", players: "all" },
        },
      ],
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "Y → all players win",
    ]);
  });

  it("formats win with specific player list", () => {
    const termination = {
      conditions: [
        {
          condition: { kind: "value", value: "Z" },
          outcome: { type: "win", players: [1, 3] },
        },
      ],
    };
    assert.deepStrictEqual(formatTerminationConditions(termination), [
      "Z → players 1, 3 win",
    ]);
  });
});
