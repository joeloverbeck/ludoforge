import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Mock artifact writer before importing runner
mock.module("../../src/evolution-runner/artifact-writer.js", {
  namedExports: {
    async writeGenerationArtifacts({ generation }) {
      return {
        generationDir: `/mock/generation-${generation}`,
        populationPath: `/mock/generation-${generation}/population.jsonl`,
        preferenceModelPath: `/mock/generation-${generation}/preference-model.jsonl`,
      };
    },
    async writeSeedReport() {},
  },
});

const { runEvolutionRunner } = await import(
  "../../src/evolution-runner/runner.js"
);
const { createEvaluator } = await import(
  "../../src/evaluation-analytics/create-evaluator.js"
);

const { generateSeedPopulation } = await import(
  "../../src/seed-generation/generate-seed-population.js"
);

describe("seed-generation-pipeline e2e", () => {
  it("generates 16 genomes with default config and <25% evaluation-error rate", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "variety", "strategic_depth", "interaction_rate"],
      seed: 42,
    });
    const mapElitesConfig = {
      descriptors: [
        { id: "agency", min: 0, max: 1, bins: 5 },
        { id: "variety", min: 0, max: 1, bins: 5 },
        { id: "strategic_depth", min: 0, max: 50, bins: 5 },
        { id: "interaction_rate", min: 0, max: 1, bins: 5 },
      ],
    };
    const result = await generateSeedPopulation({
      populationSize: 16,
      maxAttempts: 500,
      rngSeed: 42,
      evaluator,
      mapElitesConfig,
      coverageStrategy: "uniform-bins",
      fallback: { strategy: "accept-any-valid" },
    });
    assert.equal(result.genomes.length, 16, "should produce 16 genomes");
    const evalErrors = result.report.rejectedByReason["evaluation-error"] ?? 0;
    const errorRate = evalErrors / result.report.attempts;
    assert.ok(
      errorRate < 0.50,
      `evaluation-error rate ${(errorRate * 100).toFixed(1)}% should be <50% (${evalErrors} errors in ${result.report.attempts} attempts)`
    );
  });


  it("completes a full run with seeding.mode=generate (no pre-loaded population)", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "variety"],
      seed: 99,
    });

    const result = await runEvolutionRunner({
      config: {
        runner: { generations: 1, shortlistSize: 2 },
        mapElites: {
          descriptors: [
            { id: "agency", min: 0, max: 1, bins: 2 },
            { id: "variety", min: 0, max: 1, bins: 2 },
          ],
        },
        seed: 99,
        seeding: {
          mode: "generate",
          populationSize: 4,
          generate: {
            coverage: {
              strategy: "uniform-bins",
              maxAttempts: 500,
              fallback: { strategy: "accept-any-valid" },
            },
            grammar: {},
          },
        },
        evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
      },
      evaluation: { evaluator },
      seed: 99,
    });

    assert.ok(result.runId, "Result should have a runId");
    assert.equal(result.generations.length, 1, "Should produce exactly 1 generation");

    const gen = result.generations[0];
    assert.ok(gen.population.length > 0, "Generation should have a non-empty population");
    assert.ok(gen.evaluated.length > 0, "Generation should have evaluated genomes");
    assert.ok(gen.mapElites, "Generation should have MAP-Elites result");
    assert.ok(Array.isArray(gen.shortlist), "Generation should have a shortlist array");
  });
});
