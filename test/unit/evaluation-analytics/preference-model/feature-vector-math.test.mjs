import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cloneFeatureVector,
  scaleFeatureVector,
  addFeatureVectors,
  diffFeatureVectors,
} from "../../../../src/evaluation-analytics/preference-model/feature-vector-math.js";

describe("feature-vector-math", () => {
  describe("cloneFeatureVector", () => {
    it("returns shallow copy of object", () => {
      const original = { a: 1, b: 2 };
      const clone = cloneFeatureVector(original);
      assert.deepEqual(clone, original);
      assert.notStrictEqual(clone, original);
    });

    it("returns empty object for null", () => {
      assert.deepEqual(cloneFeatureVector(null), {});
    });

    it("returns empty object for undefined", () => {
      assert.deepEqual(cloneFeatureVector(undefined), {});
    });

    it("returns empty object for non-objects", () => {
      assert.deepEqual(cloneFeatureVector(42), {});
      assert.deepEqual(cloneFeatureVector("str"), {});
    });
  });

  describe("scaleFeatureVector", () => {
    it("multiplies all values by scalar", () => {
      assert.deepEqual(scaleFeatureVector({ a: 2, b: -3 }, 0.5), { a: 1, b: -1.5 });
    });

    it("handles null vector", () => {
      assert.deepEqual(scaleFeatureVector(null, 2), {});
    });

    it("treats non-finite values as 0", () => {
      assert.deepEqual(scaleFeatureVector({ a: NaN, b: 1 }, 2), { a: 0, b: 2 });
    });
  });

  describe("addFeatureVectors", () => {
    it("adds matching keys", () => {
      assert.deepEqual(addFeatureVectors({ a: 1 }, { a: 2 }), { a: 3 });
    });

    it("merges new keys from delta", () => {
      assert.deepEqual(addFeatureVectors({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
    });

    it("handles null delta", () => {
      assert.deepEqual(addFeatureVectors({ a: 1 }, null), { a: 1 });
    });

    it("treats non-finite values as 0", () => {
      assert.deepEqual(addFeatureVectors({ a: NaN }, { a: 1 }), { a: 1 });
    });
  });

  describe("diffFeatureVectors", () => {
    it("subtracts matching keys", () => {
      assert.deepEqual(diffFeatureVectors({ a: 5 }, { a: 2 }), { a: 3 });
    });

    it("subtracts new keys from b (treated as 0 in a)", () => {
      assert.deepEqual(diffFeatureVectors({ a: 1 }, { b: 2 }), { a: 1, b: -2 });
    });

    it("handles null b", () => {
      assert.deepEqual(diffFeatureVectors({ a: 1 }, null), { a: 1 });
    });

    it("treats non-finite as 0 in subtraction", () => {
      assert.deepEqual(diffFeatureVectors({ a: NaN }, { a: 3 }), { a: -3 });
    });
  });
});
