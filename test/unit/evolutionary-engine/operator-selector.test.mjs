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

  it("observe handles null/undefined/empty telemetry safely", () => {
    const operators = [createOperator("solo")];
    const weights = { solo: 1 };
    const selector = new WeightedSelector({ operators, weights });

    assert.doesNotThrow(() => selector.observe());
    assert.doesNotThrow(() => selector.observe(null));
    assert.doesNotThrow(() => selector.observe(undefined));
    assert.doesNotThrow(() => selector.observe({}));
    assert.doesNotThrow(() => selector.observe({ operators: null }));

    assert.deepStrictEqual(selector.weights, [1]);
  });

  it("observe halves weight when failure rate > 30%", () => {
    const operators = [createOperator("a"), createOperator("b")];
    const weights = { a: 2, b: 4 };
    const selector = new WeightedSelector({ operators, weights });

    selector.observe({
      operators: {
        a: { attempts: 10, validEvaluated: 5 },
        b: { attempts: 10, validEvaluated: 10 },
      },
    });

    assert.equal(selector.weights[0], 1);
    assert.equal(selector.weights[1], 4);
  });

  it("observe restores weight when failure rate < 10%", () => {
    const operators = [createOperator("x")];
    const weights = { x: 4 };
    const selector = new WeightedSelector({ operators, weights });

    selector.weights = [1];

    selector.observe({
      operators: {
        x: { attempts: 10, validEvaluated: 10 },
      },
    });

    assert.equal(selector.weights[0], 1 + (4 - 1) * 0.5);
  });

  it("observe does not drop below minimum floor", () => {
    const operators = [createOperator("low")];
    const weights = { low: 0.15 };
    const selector = new WeightedSelector({ operators, weights });

    selector.observe({
      operators: {
        low: { attempts: 10, validEvaluated: 2 },
      },
    });

    assert.equal(selector.weights[0], 0.1);
  });

  it("observe never exceeds base weight", () => {
    const operators = [createOperator("cap")];
    const weights = { cap: 2 };
    const selector = new WeightedSelector({ operators, weights });

    selector.weights = [1.9];

    selector.observe({
      operators: {
        cap: { attempts: 100, validEvaluated: 100 },
      },
    });

    assert.ok(selector.weights[0] <= 2);
    assert.equal(selector.weights[0], 1.9 + (2 - 1.9) * 0.5);
  });

  it("observe makes no adjustment in neutral zone", () => {
    const operators = [createOperator("mid")];
    const weights = { mid: 3 };
    const selector = new WeightedSelector({ operators, weights });

    selector.observe({
      operators: {
        mid: { attempts: 10, validEvaluated: 8 },
      },
    });

    assert.equal(selector.weights[0], 3);
  });

  it("penalizes when validEvaluated=0 and attempts=100 (inefficiency 1.0)", () => {
    const operators = [createOperator("bad")];
    const weights = { bad: 2 };
    const selector = new WeightedSelector({ operators, weights });

    selector.observe({
      operators: {
        bad: { attempts: 100, validEvaluated: 0 },
      },
    });

    assert.equal(selector.weights[0], Math.max(0.1, 2 * 0.5));
  });

  it("restores when validEvaluated=95 and attempts=100 (inefficiency 0.05)", () => {
    const operators = [createOperator("good")];
    const weights = { good: 4 };
    const selector = new WeightedSelector({ operators, weights });

    selector.weights = [1];

    selector.observe({
      operators: {
        good: { attempts: 100, validEvaluated: 95 },
      },
    });

    assert.equal(selector.weights[0], 1 + (4 - 1) * 0.5);
  });

});
