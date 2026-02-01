import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveSeedPopulation } from "../../src/evolution-runner/seed-resolver.js";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

describe("resolveSeedPopulation with real evaluator", () => {
  it("produces exactly populationSize genomes without throwing", async () => {
    const populationSize = 8;
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "variety"],
      seed: 42,
    });

    const config = {
      seeding: {
        mode: "generate",
        populationSize,
        generate: {
          coverage: {
            strategy: "uniform-bins",
            maxAttempts: 500,
            fallback: { strategy: "accept-any-valid" },
            specialOnly: { policy: "cap", maxFraction: 0.10 },
          },
          grammar: {},
        },
      },
      mapElites: {
        descriptors: [
          { id: "agency", min: 0, max: 1, bins: 3 },
          { id: "variety", min: 0, max: 1, bins: 3 },
        ],
      },
    };

    const result = await resolveSeedPopulation({
      config,
      rngSeed: 42,
      evaluator,
    });

    assert.equal(
      result.genomes.length,
      populationSize,
      `Expected ${populationSize} genomes, got ${result.genomes.length}`
    );

    // Validate report structure
    assert.ok(result.report, "Result should include a report");
    assert.equal(result.report.mode, "generate");
    assert.ok(result.report.generate, "Report should include generate sub-report");
    assert.ok(
      Number.isInteger(result.report.generate.attempts),
      "Report should include attempt count"
    );

    // Validate genome structure
    for (const genome of result.genomes) {
      assert.ok(typeof genome.id === "string" && genome.id.length > 0, "Genome must have a non-empty id");
      assert.ok(genome.definition && typeof genome.definition === "object", "Genome must have a definition object");
    }
  });
});
