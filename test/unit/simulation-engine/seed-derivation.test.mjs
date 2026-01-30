import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveSeed } from "../../../src/simulation-engine/seed-derivation.js";

describe("seed-derivation", () => {
  describe("deriveSeed", () => {
    it("returns consistent uint32 for identical inputs", () => {
      const a = deriveSeed(42, "suite", "random-only", 0);
      const b = deriveSeed(42, "suite", "random-only", 0);
      assert.equal(a, b);
    });

    it("returns a non-negative 32-bit integer", () => {
      const result = deriveSeed(42, "suite", "random-only", 0);
      assert.equal(typeof result, "number");
      assert.ok(result >= 0, `expected non-negative, got ${result}`);
      assert.ok(result <= 0xffffffff, `expected <= 2^32-1, got ${result}`);
      assert.ok(Number.isInteger(result), "expected integer");
    });

    it("different component tuples produce different seeds", () => {
      const seeds = new Set();
      for (let i = 0; i < 1000; i += 1) {
        seeds.add(deriveSeed(42, "test", i));
      }
      assert.ok(
        seeds.size >= 990,
        `expected at least 990 unique seeds from 1000 inputs, got ${seeds.size}`
      );
    });

    it("different base seeds produce different results", () => {
      const a = deriveSeed(1, "suite", 0);
      const b = deriveSeed(2, "suite", 0);
      assert.notEqual(a, b);
    });

    it("different string components produce different results", () => {
      const a = deriveSeed(42, "alpha");
      const b = deriveSeed(42, "beta");
      assert.notEqual(a, b);
    });

    it("handles zero base seed", () => {
      const result = deriveSeed(0, "test");
      assert.equal(typeof result, "number");
      assert.ok(result >= 0);
    });

    it("handles no components (base seed only)", () => {
      const a = deriveSeed(42);
      const b = deriveSeed(42);
      assert.equal(a, b);
      assert.ok(Number.isInteger(a));
      assert.ok(a >= 0);
    });

    it("handles negative base seed by treating as unsigned", () => {
      const result = deriveSeed(-1, "test");
      assert.ok(result >= 0);
      assert.ok(result <= 0xffffffff);
    });
  });
});
