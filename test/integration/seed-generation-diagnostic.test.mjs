import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateGameDefinition } from "../../src/seed-generation/grammar-generator.js";
import { createGenomeId } from "../../src/evolutionary-engine/serialization.js";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";
import { createSeededRng } from "../../src/simulation-engine/rng.js";

describe("seed-generation diagnostic", () => {
  it("tracks rejection distribution across 200 generation attempts", async () => {
    const rng = createSeededRng(42);
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "variety"],
      seed: 42,
    });

    const counts = {
      "generation-error": 0,
      "invalid-definition": 0,
      duplicate: 0,
      "evaluation-error": 0,
      "evaluation-failure": 0,
      "evaluation-ok": 0,
    };
    const totalAttempts = 200;

    for (let i = 0; i < totalAttempts; i++) {
      let definition;
      try {
        definition = generateGameDefinition({ rng });
      } catch (err) {
        counts["generation-error"]++;
        continue;
      }

      let id;
      try {
        id = createGenomeId(definition);
      } catch (err) {
        counts["invalid-definition"]++;
        continue;
      }

      const genome = { id, definition };

      let result;
      try {
        result = await evaluator(genome);
      } catch {
        counts["evaluation-error"]++;
        continue;
      }

      if (
        result.fitness == null ||
        result.descriptors == null ||
        result.diagnostics?.logAdapterOk === false ||
        result.diagnostics?.simulationError === true
      ) {
        counts["evaluation-failure"]++;
        continue;
      }

      counts["evaluation-ok"]++;
    }

    const successRate = counts["evaluation-ok"] / totalAttempts;

    // The pipeline must produce some successful evaluations
    assert.ok(
      counts["evaluation-ok"] > 0,
      `Expected at least some successful evaluations, got breakdown: ${JSON.stringify(counts)}`
    );

    // Evaluator reports failures via diagnostics instead of throwing.
    assert.equal(
      counts["evaluation-error"],
      0,
      `Expected evaluator to return diagnostics, got breakdown: ${JSON.stringify(counts)}`
    );

    // Success rate should be between 5% and 80% — high enough to eventually
    // fill a population with sufficient maxAttempts, but low enough to confirm
    // the pipeline needs headroom
    assert.ok(
      successRate > 0.05,
      `Success rate too low (${(successRate * 100).toFixed(1)}%), pipeline may be broken`
    );
    assert.ok(
      successRate < 0.8,
      `Success rate unexpectedly high (${(successRate * 100).toFixed(1)}%), test assumptions may be outdated`
    );
  });
});
