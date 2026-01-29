import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEvaluator } from "../../../src/evaluation-analytics/create-evaluator.js";

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeGenome(definition = choiceGame) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("createEvaluator", () => {
  it("returns an object with evaluator as a function", () => {
    const result = createEvaluator();
    assert.equal(typeof result.evaluator, "function");
  });

  it("evaluator returns { fitness, descriptors, diagnostics }", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.ok("fitness" in result);
    assert.ok("descriptors" in result);
    assert.ok("diagnostics" in result);
  });

  it("fitness is a finite number", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.equal(typeof result.fitness, "number");
    assert.ok(Number.isFinite(result.fitness), `fitness should be finite, got ${result.fitness}`);
  });

  it("default descriptorKeys yields agency and variety", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.ok("agency" in result.descriptors);
    assert.ok("variety" in result.descriptors);
    assert.equal(Object.keys(result.descriptors).length, 2);
  });

  it("custom descriptorKeys controls descriptor extraction", () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "strategic_depth", "pacing_tension"],
    });
    const result = evaluator(makeGenome());
    assert.deepStrictEqual(
      Object.keys(result.descriptors).sort(),
      ["agency", "pacing_tension", "strategic_depth"]
    );
  });

  it("simulationRuns controls batch count", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 3 });
    const result = evaluator(makeGenome());
    assert.equal(result.diagnostics.simulationCount, 3);
  });

  it("diagnostics.coreMetrics is a non-empty array", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.coreMetrics));
    assert.ok(result.diagnostics.coreMetrics.length > 0);
  });

  it("diagnostics.extendedMetrics is null by default", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.equal(result.diagnostics.extendedMetrics, null);
  });

  it("includeExtendedMetrics: true populates extendedMetrics array", () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      includeExtendedMetrics: true,
    });
    const result = evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.extendedMetrics));
    assert.ok(result.diagnostics.extendedMetrics.length > 0);
  });

  it("diagnostics.degeneracy has flags array", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.degeneracy.flags));
  });

  it("diagnostics.featureVector is an object", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.equal(typeof result.diagnostics.featureVector, "object");
    assert.ok(result.diagnostics.featureVector !== null);
  });

  it("diagnostics.fitnessResult has score", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = evaluator(makeGenome());
    assert.equal(typeof result.diagnostics.fitnessResult.score, "number");
  });

  it("genome is not mutated", () => {
    const genome = makeGenome();
    const snapshot = JSON.stringify(genome);
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    evaluator(genome);
    assert.equal(JSON.stringify(genome), snapshot);
  });

  it("same seed produces deterministic results", () => {
    const { evaluator } = createEvaluator({ simulationRuns: 3, seed: 42 });
    const result1 = evaluator(makeGenome());
    const result2 = evaluator(makeGenome());
    assert.equal(result1.fitness, result2.fitness);
    assert.deepStrictEqual(result1.descriptors, result2.descriptors);
  });

  it("custom agentFactory is called", () => {
    let factoryCalled = false;
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      agentFactory(definition) {
        factoryCalled = true;
        return Array.from({ length: definition.players.count }, () => ({
          kind: "random",
        }));
      },
    });
    evaluator(makeGenome());
    assert.ok(factoryCalled);
  });

  it("missing descriptor keys default to 0", () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["nonexistent_key_xyz"],
    });
    const result = evaluator(makeGenome());
    assert.equal(result.descriptors.nonexistent_key_xyz, 0);
  });
});
