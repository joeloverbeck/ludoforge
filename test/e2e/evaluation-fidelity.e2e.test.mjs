import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function makeGenome(id, definition) {
  return { id, definition };
}

describe("evaluation-fidelity", () => {
  describe("choice game produces high agency", () => {
    it("choice-game with 2 actions has agency > 0.3", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = makeGenome("choice-game", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.fitness !== null, "fitness should not be null");
      assert.ok(result.descriptors !== null, "descriptors should not be null");
      assert.ok(
        result.descriptors.agency > 0.3,
        `expected agency > 0.3, got ${result.descriptors.agency}`
      );
    });
  });

  describe("single-action game produces low agency", () => {
    it("evo-seed-1 with 1 action has agency < 0.1", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const genome = makeGenome("single-action", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.fitness !== null, "fitness should not be null");
      assert.ok(result.descriptors !== null, "descriptors should not be null");
      assert.ok(
        result.descriptors.agency < 0.1,
        `expected agency < 0.1, got ${result.descriptors.agency}`
      );
    });
  });

  describe("non-terminating game includes degeneracy flags", () => {
    it("evo-non-terminating has degeneracy flags in diagnostics", async () => {
      const definition = await loadFixture("evo-non-terminating.json");
      const genome = makeGenome("non-terminating", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.diagnostics, "diagnostics should exist");
      assert.ok(result.diagnostics.degeneracy, "degeneracy report should exist");
      assert.ok(
        Array.isArray(result.diagnostics.degeneracy.flags),
        "degeneracy flags should be an array"
      );
      assert.ok(
        result.diagnostics.degeneracy.flags.length > 0,
        "non-terminating game should have at least one degeneracy flag"
      );
    });
  });

  describe("metric determinism", () => {
    it("same genome + same seed produces identical metrics", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = makeGenome("determinism-test", definition);

      const evaluator1 = createEvaluator({ seed: 77, simulationRuns: 3 });
      const evaluator2 = createEvaluator({ seed: 77, simulationRuns: 3 });

      const result1 = evaluator1.evaluator(genome);
      const result2 = evaluator2.evaluator(genome);

      assert.equal(result1.fitness, result2.fitness);
      assert.deepEqual(result1.descriptors, result2.descriptors);
      assert.deepEqual(
        result1.diagnostics.coreMetrics,
        result2.diagnostics.coreMetrics
      );
    });
  });
});
