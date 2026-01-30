import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateDecPrecondition,
  andExpr,
} from "../../../src/seed-generation/primitives.js";

describe("generateDecPrecondition", () => {
  it("returns cmp > with min value", () => {
    const result = generateDecPrecondition({
      variableId: "hp",
      variableDef: { type: { kind: "int", min: 0, max: 10 } },
    });
    assert.equal(result.kind, "cmp");
    assert.equal(result.op, ">");
    assert.deepStrictEqual(result.left, {
      kind: "ref",
      ref: { kind: "var", id: "hp" },
    });
    assert.deepStrictEqual(result.right, { kind: "value", value: 0 });
  });

  it("uses actual min from variableDef", () => {
    const result = generateDecPrecondition({
      variableId: "energy",
      variableDef: { type: { kind: "int", min: 5, max: 20 } },
    });
    assert.deepStrictEqual(result.right, { kind: "value", value: 5 });
  });
});

describe("andExpr", () => {
  it("builds and node from two expressions", () => {
    const left = { kind: "cmp", op: "<", left: {}, right: {} };
    const right = { kind: "cmp", op: ">", left: {}, right: {} };
    const result = andExpr(left, right);
    assert.equal(result.kind, "and");
    assert.strictEqual(result.left, left);
    assert.strictEqual(result.right, right);
  });
});
