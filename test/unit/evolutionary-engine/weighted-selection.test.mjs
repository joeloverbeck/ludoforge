import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { weightedSelect } from "../../../src/evolutionary-engine/mutation/weighted-selection.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

describe("weightedSelect", () => {
  it("is deterministic for a fixed seed", () => {
    const rng = createSeededRng(1337);
    const names = ["alpha", "beta", "gamma"];
    const weights = [1, 2, 3];

    const picks = Array.from({ length: 10 }, () => weightedSelect(names, weights, rng));

    assert.deepEqual(picks, [
      "gamma",
      "gamma",
      "beta",
      "alpha",
      "beta",
      "beta",
      "gamma",
      "gamma",
      "gamma",
      "beta",
    ]);
  });

  it("heavier weights dominate the sample", () => {
    const rng = createSeededRng(42);
    const names = ["light", "heavy"];
    const weights = [1, 10];

    const counts = { light: 0, heavy: 0 };
    for (let i = 0; i < 1000; i += 1) {
      const pick = weightedSelect(names, weights, rng);
      counts[pick] += 1;
    }

    assert.equal(counts.light, 71);
    assert.equal(counts.heavy, 929);
  });

  it("throws on empty names", () => {
    assert.throws(() => weightedSelect([], [], createSeededRng(1)), /non-empty/i);
  });

  it("throws on mismatched lengths", () => {
    assert.throws(
      () => weightedSelect(["a", "b"], [1], createSeededRng(1)),
      /same length/i,
    );
  });

  it("always returns the only name", () => {
    const rng = createSeededRng(7);
    const names = ["solo"];
    const weights = [3];
    for (let i = 0; i < 5; i += 1) {
      assert.equal(weightedSelect(names, weights, rng), "solo");
    }
  });
});
