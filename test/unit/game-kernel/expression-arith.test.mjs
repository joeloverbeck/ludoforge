import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateExpr } from "../../../src/game-kernel/expression-eval.js";

/** helper: value literal */
const val = (v) => ({ kind: "value", value: v });

/** helper: arith expression */
const arith = (op, left, right) => ({ kind: "arith", op, left, right });

/** helper: cmp expression wrapping arith */
const cmpArith = (arithExpr, cmpOp, rightVal) => ({
  kind: "cmp",
  op: cmpOp,
  left: arithExpr,
  right: val(rightVal),
});

describe("expression-eval arith kind", () => {
  describe("basic operators", () => {
    it("addition", () => {
      const expr = cmpArith(arith("+", val(3), val(4)), "==", 7);
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("subtraction", () => {
      const expr = cmpArith(arith("-", val(10), val(3)), "==", 7);
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("multiplication", () => {
      const expr = cmpArith(arith("*", val(3), val(4)), "==", 12);
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("integer division (truncates toward zero)", () => {
      const expr = cmpArith(arith("/", val(7), val(2)), "==", 3);
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("modulo", () => {
      const expr = cmpArith(arith("%", val(10), val(3)), "==", 1);
      assert.equal(evaluateExpr(expr, {}), true);
    });
  });

  describe("modulo by zero", () => {
    it("returns falsy (undefined coerced to false in boolean context)", () => {
      const expr = arith("%", val(10), val(0));
      assert.equal(evaluateExpr(expr, {}), false);
    });

    it("comparison with modulo-by-zero yields false", () => {
      const expr = cmpArith(arith("%", val(10), val(0)), "==", 0);
      assert.equal(evaluateExpr(expr, {}), false);
    });
  });

  describe("division by zero", () => {
    it("returns falsy (undefined)", () => {
      const expr = arith("/", val(10), val(0));
      assert.equal(evaluateExpr(expr, {}), false);
    });

    it("comparison with div-by-zero yields false", () => {
      const expr = cmpArith(arith("/", val(10), val(0)), "==", 0);
      assert.equal(evaluateExpr(expr, {}), false);
    });
  });

  describe("impulse movement pattern", () => {
    function makeImpulseContext(counterValue) {
      const variableIndex = new Map([
        ["impulse_counter", { id: "impulse_counter", scope: "global", type: "int", min: 0, max: 100 }],
      ]);
      return {
        variableIndex,
        state: {
          variables: {
            global: { impulse_counter: counterValue },
          },
          tokens: {},
        },
      };
    }

    it("impulse_counter % speed == 0 for matching impulse", () => {
      // speed=2, counter=4 → 4%2==0 → true
      const expr = {
        kind: "cmp",
        op: "==",
        left: arith(
          "%",
          { kind: "ref", ref: { kind: "var", id: "impulse_counter" } },
          val(2),
        ),
        right: val(0),
      };
      assert.equal(evaluateExpr(expr, makeImpulseContext(4)), true);
    });

    it("impulse_counter % speed == 0 for non-matching impulse", () => {
      // speed=2, counter=3 → 3%2==1 → false
      const expr = {
        kind: "cmp",
        op: "==",
        left: arith(
          "%",
          { kind: "ref", ref: { kind: "var", id: "impulse_counter" } },
          val(2),
        ),
        right: val(0),
      };
      assert.equal(evaluateExpr(expr, makeImpulseContext(3)), false);
    });

    it("speed-1 unit moves every impulse", () => {
      const expr = {
        kind: "cmp",
        op: "==",
        left: arith(
          "%",
          { kind: "ref", ref: { kind: "var", id: "impulse_counter" } },
          val(1),
        ),
        right: val(0),
      };
      for (const counter of [0, 1, 2, 5, 10]) {
        assert.equal(evaluateExpr(expr, makeImpulseContext(counter)), true,
          `expected true for counter=${counter}`);
      }
    });

    it("speed-3 unit moves every third impulse", () => {
      const expr = {
        kind: "cmp",
        op: "==",
        left: arith(
          "%",
          { kind: "ref", ref: { kind: "var", id: "impulse_counter" } },
          val(3),
        ),
        right: val(0),
      };
      assert.equal(evaluateExpr(expr, makeImpulseContext(0)), true);
      assert.equal(evaluateExpr(expr, makeImpulseContext(1)), false);
      assert.equal(evaluateExpr(expr, makeImpulseContext(2)), false);
      assert.equal(evaluateExpr(expr, makeImpulseContext(3)), true);
      assert.equal(evaluateExpr(expr, makeImpulseContext(6)), true);
      assert.equal(evaluateExpr(expr, makeImpulseContext(7)), false);
    });
  });

  describe("nested arithmetic", () => {
    it("(a + b) % c", () => {
      // (3 + 4) % 5 == 2
      const expr = cmpArith(arith("%", arith("+", val(3), val(4)), val(5)), "==", 2);
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("(a * b) - c", () => {
      // (3 * 4) - 2 == 10
      const expr = cmpArith(arith("-", arith("*", val(3), val(4)), val(2)), "==", 10);
      assert.equal(evaluateExpr(expr, {}), true);
    });
  });

  describe("non-numeric operands", () => {
    it("arith with string operand returns false", () => {
      const expr = arith("+", val("hello"), val(2));
      assert.equal(evaluateExpr(expr, {}), false);
    });

    it("arith with boolean operand returns false", () => {
      const expr = arith("+", val(true), val(2));
      assert.equal(evaluateExpr(expr, {}), false);
    });
  });

  describe("arith used standalone (boolean coercion)", () => {
    it("nonzero result is truthy", () => {
      const expr = arith("+", val(3), val(4));
      assert.equal(evaluateExpr(expr, {}), true);
    });

    it("zero result is falsy", () => {
      const expr = arith("-", val(3), val(3));
      assert.equal(evaluateExpr(expr, {}), false);
    });
  });

  describe("unknown arith operator", () => {
    it("returns false for unknown op", () => {
      const expr = arith("^", val(2), val(3));
      assert.equal(evaluateExpr(expr, {}), false);
    });
  });
});
