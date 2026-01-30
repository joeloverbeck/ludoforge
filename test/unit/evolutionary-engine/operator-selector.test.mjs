import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { WeightedSelector } from "../../../src/evolutionary-engine/operator-selector.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

function createOperator(name) {
  return { name, mutate: (genome) => genome };
}

describe("operator selectors", () => {
  it("WeightedSelector.pick is deterministic", () => {
    const operators = [createOperator("alpha"), createOperator("beta"), createOperator("gamma")];
    const weights = { alpha: 1, beta: 2, gamma: 3 };
    const selector = new WeightedSelector({ operators, weights });
    const rng = createSeededRng(1337);

    const picks = Array.from({ length: 10 }, () => selector.pick(rng));

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

  it("WeightedSelector only returns enabled operator names", () => {
    const operators = [createOperator("swap"), createOperator("tweak")];
    const weights = { swap: 1, tweak: 2 };
    const selector = new WeightedSelector({ operators, weights });
    const rng = createSeededRng(9);

    for (let i = 0; i < 20; i += 1) {
      const pick = selector.pick(rng);
      assert.ok(["swap", "tweak"].includes(pick));
    }
  });

  it("observe is a no-op", () => {
    const operators = [createOperator("solo")];
    const weights = { solo: 1 };
    const selector = new WeightedSelector({ operators, weights });

    assert.doesNotThrow(() => selector.observe("solo", { valid: true }));
  });
});
