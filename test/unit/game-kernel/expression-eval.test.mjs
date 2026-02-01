import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateValue,
  evaluateExpr,
} from "../../../src/game-kernel/expression-eval.js";

const val = (v) => ({ kind: "value", value: v });
const ref = (r) => ({ kind: "ref", ref: r });
const cmp = (op, left, right) => ({ kind: "cmp", op, left, right });

function makeContext(overrides = {}) {
  const variableIndex = new Map([
    ["hp", { id: "hp", scope: "per_player" }],
    ["round", { id: "round", scope: "global" }],
  ]);
  return {
    variableIndex,
    playerId: overrides.playerId ?? 1,
    state: {
      variables: {
        global: { round: overrides.round ?? 0 },
        perPlayer: {
          1: { hp: overrides.hp1 ?? 10 },
          2: { hp: overrides.hp2 ?? 10 },
        },
      },
      tokens: {},
    },
    ...overrides,
  };
}

describe("expression-eval", () => {
  describe("evaluateValue", () => {
    it("returns undefined for null", () => {
      assert.equal(evaluateValue(null, {}), undefined);
    });

    it("returns undefined for non-object", () => {
      assert.equal(evaluateValue(42, {}), undefined);
    });

    it("returns literal value for 'value' kind", () => {
      assert.equal(evaluateValue(val(7), {}), 7);
      assert.equal(evaluateValue(val("hello"), {}), "hello");
      assert.equal(evaluateValue(val(true), {}), true);
    });

    it("resolves ref value", () => {
      const ctx = makeContext({ round: 5 });
      const result = evaluateValue(ref({ kind: "var", id: "round" }), ctx);
      assert.equal(result, 5);
    });

    it("evaluates cmp as boolean", () => {
      const expr = cmp("==", val(3), val(3));
      assert.equal(evaluateValue(expr, {}), true);
    });

    it("evaluates and/or/not via evaluateExpr", () => {
      const expr = { kind: "and", left: val(true), right: val(false) };
      assert.equal(evaluateValue(expr, {}), false);
    });

    it("returns undefined for unknown kind", () => {
      assert.equal(evaluateValue({ kind: "unknown" }, {}), undefined);
    });
  });

  describe("evaluateExpr", () => {
    it("returns false for null", () => {
      assert.equal(evaluateExpr(null, {}), false);
    });

    it("returns false for non-object", () => {
      assert.equal(evaluateExpr("hello", {}), false);
    });

    describe("comparison operators", () => {
      it("== returns true for equal values", () => {
        assert.equal(evaluateExpr(cmp("==", val(5), val(5)), {}), true);
      });

      it("== returns false for unequal values", () => {
        assert.equal(evaluateExpr(cmp("==", val(5), val(6)), {}), false);
      });

      it("!= works", () => {
        assert.equal(evaluateExpr(cmp("!=", val(5), val(6)), {}), true);
        assert.equal(evaluateExpr(cmp("!=", val(5), val(5)), {}), false);
      });

      it("< works for numbers", () => {
        assert.equal(evaluateExpr(cmp("<", val(3), val(5)), {}), true);
        assert.equal(evaluateExpr(cmp("<", val(5), val(3)), {}), false);
      });

      it("<= works for numbers", () => {
        assert.equal(evaluateExpr(cmp("<=", val(5), val(5)), {}), true);
        assert.equal(evaluateExpr(cmp("<=", val(6), val(5)), {}), false);
      });

      it("> works for numbers", () => {
        assert.equal(evaluateExpr(cmp(">", val(5), val(3)), {}), true);
      });

      it(">= works for numbers", () => {
        assert.equal(evaluateExpr(cmp(">=", val(5), val(5)), {}), true);
      });

      it("defaults to == when op is missing", () => {
        const expr = { kind: "cmp", left: val(3), right: val(3) };
        assert.equal(evaluateExpr(expr, {}), true);
      });

      it("numeric ops return false for non-number operands", () => {
        assert.equal(evaluateExpr(cmp("<", val("a"), val("b")), {}), false);
      });
    });

    describe("logical operators", () => {
      it("and: true && true = true", () => {
        const expr = { kind: "and", left: val(true), right: val(true) };
        assert.equal(evaluateExpr(expr, {}), true);
      });

      it("and: true && false = false", () => {
        const expr = { kind: "and", left: val(true), right: val(false) };
        assert.equal(evaluateExpr(expr, {}), false);
      });

      it("or: false || true = true", () => {
        const expr = { kind: "or", left: val(false), right: val(true) };
        assert.equal(evaluateExpr(expr, {}), true);
      });

      it("or: false || false = false", () => {
        const expr = { kind: "or", left: val(false), right: val(false) };
        assert.equal(evaluateExpr(expr, {}), false);
      });

      it("not: negates truthy value", () => {
        const expr = { kind: "not", value: val(true) };
        assert.equal(evaluateExpr(expr, {}), false);
      });

      it("not: negates falsy value", () => {
        const expr = { kind: "not", value: val(false) };
        assert.equal(evaluateExpr(expr, {}), true);
      });
    });

    describe("value and ref in boolean context", () => {
      it("value: truthy coercion", () => {
        assert.equal(evaluateExpr(val(1), {}), true);
        assert.equal(evaluateExpr(val(0), {}), false);
      });

      it("ref: boolean coercion of resolved value", () => {
        const ctx = makeContext({ round: 5 });
        const expr = ref({ kind: "var", id: "round" });
        assert.equal(evaluateExpr(expr, ctx), true);
      });
    });

    describe("nested expressions", () => {
      it("(a == b) and (c > d)", () => {
        const expr = {
          kind: "and",
          left: cmp("==", val(1), val(1)),
          right: cmp(">", val(5), val(3)),
        };
        assert.equal(evaluateExpr(expr, {}), true);
      });

      it("not (a == b)", () => {
        const expr = {
          kind: "not",
          value: cmp("==", val(1), val(2)),
        };
        assert.equal(evaluateExpr(expr, {}), true);
      });
    });

    describe("unknown kind", () => {
      it("returns false for unknown expression kind", () => {
        assert.equal(evaluateExpr({ kind: "bogus" }, {}), false);
      });
    });
  });
});
