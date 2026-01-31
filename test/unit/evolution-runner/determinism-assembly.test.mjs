import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { assembleDeterminism } from "../../../src/evolution-runner/determinism-assembly.js";

describe("determinism-assembly", () => {
  describe("assembleDeterminism", () => {
    it("returns explicit determinism when provided", () => {
      const explicit = { seed: 42, extra: "data" };
      const result = assembleDeterminism(explicit, {}, 42);
      assert.equal(result, explicit);
    });

    it("assembles { seed } when rng present and seed is finite", () => {
      const result = assembleDeterminism(undefined, { next: () => 0 }, 123);
      assert.deepStrictEqual(result, { seed: 123 });
    });

    it("returns undefined when no rng and no explicit determinism", () => {
      const result = assembleDeterminism(undefined, null, 42);
      assert.equal(result, undefined);
    });

    it("returns undefined when rng present but seed is not finite", () => {
      assert.equal(assembleDeterminism(undefined, { next: () => 0 }, undefined), undefined);
      assert.equal(assembleDeterminism(undefined, { next: () => 0 }, NaN), undefined);
      assert.equal(assembleDeterminism(undefined, { next: () => 0 }, Infinity), undefined);
    });

    it("returns undefined when both rng and explicit are falsy", () => {
      assert.equal(assembleDeterminism(undefined, null, undefined), undefined);
      assert.equal(assembleDeterminism(null, null, null), undefined);
    });
  });
});
