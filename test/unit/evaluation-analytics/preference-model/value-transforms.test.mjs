import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampAbs,
  normalizeRatingTargetCentered,
  clampHistory,
  normalizeComparisonTarget,
} from "../../../../src/evaluation-analytics/preference-model/value-transforms.js";

describe("value-transforms", () => {
  describe("clampAbs", () => {
    it("clamps positive above limit", () => {
      assert.equal(clampAbs(10, 5), 5);
    });

    it("clamps negative below -limit", () => {
      assert.equal(clampAbs(-10, 5), -5);
    });

    it("passes through value within bounds", () => {
      assert.equal(clampAbs(3, 5), 3);
    });

    it("returns 0 for NaN", () => {
      assert.equal(clampAbs(NaN, 5), 0);
    });

    it("returns 0 for zero limit", () => {
      assert.equal(clampAbs(3, 0), 0);
    });

    it("returns 0 for non-finite limit", () => {
      assert.equal(clampAbs(3, NaN), 0);
    });
  });

  describe("normalizeRatingTargetCentered", () => {
    it("maps rating 1 to -1", () => {
      assert.equal(normalizeRatingTargetCentered(1), -1);
    });

    it("maps rating 5 to 1", () => {
      assert.equal(normalizeRatingTargetCentered(5), 1);
    });

    it("maps rating 3 to 0", () => {
      assert.equal(normalizeRatingTargetCentered(3), 0);
    });

    it("passes through values in [-1, 1]", () => {
      assert.equal(normalizeRatingTargetCentered(0.5), 0.5);
      assert.equal(normalizeRatingTargetCentered(-0.5), -0.5);
    });

    it("returns 0 for NaN", () => {
      assert.equal(normalizeRatingTargetCentered(NaN), 0);
    });

    it("passes through values outside both ranges", () => {
      assert.equal(normalizeRatingTargetCentered(10), 10);
    });
  });

  describe("clampHistory", () => {
    it("returns empty for maxHistory <= 0", () => {
      assert.deepEqual(clampHistory([1, 2, 3], 0), []);
      assert.deepEqual(clampHistory([1, 2, 3], -1), []);
    });

    it("returns original if within limit", () => {
      const h = [1, 2];
      assert.strictEqual(clampHistory(h, 5), h);
    });

    it("truncates to most recent entries", () => {
      assert.deepEqual(clampHistory([1, 2, 3, 4, 5], 3), [3, 4, 5]);
    });
  });

  describe("normalizeComparisonTarget", () => {
    it("returns 1 for 'a'", () => {
      assert.equal(normalizeComparisonTarget("a"), 1);
    });

    it("returns 0 for 'b'", () => {
      assert.equal(normalizeComparisonTarget("b"), 0);
    });

    it("returns 0.5 for tie", () => {
      assert.equal(normalizeComparisonTarget("tie"), 0.5);
    });

    it("returns 0.5 for unknown", () => {
      assert.equal(normalizeComparisonTarget("x"), 0.5);
    });
  });
});
