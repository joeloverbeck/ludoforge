import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let mockScore = 0.5;

mock.module("../../../src/evaluation-analytics/fitness.js", {
  namedExports: {
    computePreferenceAwareFitness() {
      return { score: mockScore };
    },
  },
});

const { createEvaluator } = await import(
  "../../../src/evaluation-analytics/create-evaluator.js"
);

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeGenome(definition = choiceGame) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("createEvaluator — non-finite fitness guard", () => {
  it("returns fitness null when score is NaN", async () => {
    mockScore = Number.NaN;
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.nonFiniteFitness, true);
    assert.ok(Number.isNaN(result.diagnostics.fitnessResult.score));
  });

  it("returns fitness null when score is Infinity", async () => {
    mockScore = Number.POSITIVE_INFINITY;
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.nonFiniteFitness, true);
    assert.equal(result.diagnostics.fitnessResult.score, Number.POSITIVE_INFINITY);
  });

  it("returns fitness null when score is -Infinity", async () => {
    mockScore = Number.NEGATIVE_INFINITY;
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.nonFiniteFitness, true);
    assert.equal(result.diagnostics.fitnessResult.score, Number.NEGATIVE_INFINITY);
  });

  it("passes through finite fitness scores", async () => {
    mockScore = 0.42;
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, 0.42);
    assert.ok(result.descriptors);
    assert.equal(result.diagnostics.nonFiniteFitness, undefined);
    assert.equal(result.diagnostics.fitnessResult.score, 0.42);
  });
});
