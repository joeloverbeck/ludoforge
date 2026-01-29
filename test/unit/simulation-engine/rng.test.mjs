import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../../../src/simulation-engine/index.js";

describe("rng", () => {
  describe("createSeededRng", () => {
    it("yields a stable sequence for the same seed", () => {
      const rngA = createSeededRng(42);
      const rngB = createSeededRng(42);

      const seqA = Array.from({ length: 5 }, () => rngA.next());
      const seqB = Array.from({ length: 5 }, () => rngB.next());

      assert.deepEqual(seqA, seqB);
    });

    it("diverges for different seeds", () => {
      const rngA = createSeededRng(1);
      const rngB = createSeededRng(2);

      const seqA = Array.from({ length: 4 }, () => rngA.next());
      const seqB = Array.from({ length: 4 }, () => rngB.next());

      assert.notDeepEqual(seqA, seqB);
    });

    it("rejects invalid seeds", () => {
      assert.throws(() => createSeededRng(-1), /32-bit unsigned/);
      assert.throws(() => createSeededRng(2 ** 32), /32-bit unsigned/);
      assert.throws(() => createSeededRng(1.5), /integer/);
    });
  });

  describe("nextInt", () => {
    it("returns integers within bounds", () => {
      const rng = createSeededRng(7);

      for (let i = 0; i < 10; i += 1) {
        const value = rng.nextInt(3);
        assert.equal(Number.isInteger(value), true);
        assert.ok(value >= 0 && value < 3);
      }
    });
  });
});
