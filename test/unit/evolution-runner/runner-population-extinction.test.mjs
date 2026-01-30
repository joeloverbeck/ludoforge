import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { runEvolutionRunner } from "../../../src/evolution-runner/runner.js";

async function loadMinimalDefinition() {
  const fileUrl = new URL("../fixtures/dsl/valid/minimal.json", import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function createBaseConfig(overrides = {}) {
  const baseRunner = {
    generations: 1,
    shortlistSize: 0,
    maxRetainedGenerations: 100,
  };
  const runner = { ...baseRunner, ...(overrides.runner ?? {}) };

  return {
    version: "v1",
    runner,
    mapElites: {
      descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
    },
    ...overrides,
    runner,
  };
}

describe("runner population extinction", () => {
  it("halts gracefully when all genomes are rejected", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-extinct-"));
    const definition = await loadMinimalDefinition();

    const population = [
      { id: "seed-a", definition },
      { id: "seed-b", definition },
    ];

    let generationCount = 0;

    const evaluation = {
      evaluator: (genome) => {
        // Gen 0: accept all; Gen 1+: reject all
        if (generationCount === 0) {
          return {
            fitness: genome.id === "seed-a" ? 1 : 2,
            descriptors: { axis: genome.id === "seed-a" ? 0 : 1 },
          };
        }
        return { fitness: null, descriptors: null };
      },
    };

    // Wrap evaluator to track generation boundaries.
    // runGenerationLoop evaluates the entire population in one call per generation.
    // We detect generation transitions when the population is evaluated again.
    let callsThisGeneration = 0;
    const originalEvaluator = evaluation.evaluator;
    evaluation.evaluator = (genome) => {
      callsThisGeneration += 1;
      if (callsThisGeneration > population.length) {
        generationCount += 1;
        callsThisGeneration = 1;
      }
      return originalEvaluator(genome);
    };

    const config = createBaseConfig({
      runner: {
        generations: 5,
        shortlistSize: 0,
        maxConsecutiveRejections: 100, // Don't trigger rejection-rate halt
      },
      evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
    });

    const result = await runEvolutionRunner({
      baseDir,
      runId: "123e4567-e89b-42d3-a456-426614174400",
      seed: 200,
      config,
      population,
      evaluation,
    });

    assert.ok(result.haltedReason, "should have a haltedReason");
    assert.equal(result.haltedReason.cause, "population-extinction");
    assert.equal(typeof result.haltedReason.generation, "number");
    assert.equal(typeof result.haltedReason.evaluated, "number");
    assert.equal(typeof result.haltedReason.rejected, "number");
    // Should have completed gen 0 successfully, then halted at gen 1
    assert.ok(result.generations.length >= 1, "at least gen 0 should have completed");
  });

  it("halts gracefully when single genome is rejected", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-extinct-single-"));
    const definition = await loadMinimalDefinition();

    const population = [{ id: "seed-a", definition }];

    let generationCount = 0;

    const evaluation = {
      evaluator: () => {
        if (generationCount === 0) {
          return { fitness: 1, descriptors: { axis: 0.5 } };
        }
        return { fitness: null, descriptors: null };
      },
    };

    let callsThisGeneration = 0;
    const originalEvaluator = evaluation.evaluator;
    evaluation.evaluator = (genome) => {
      callsThisGeneration += 1;
      if (callsThisGeneration > 1) {
        generationCount += 1;
        callsThisGeneration = 1;
      }
      return originalEvaluator(genome);
    };

    const config = createBaseConfig({
      runner: {
        generations: 5,
        shortlistSize: 0,
        maxConsecutiveRejections: 100,
      },
      evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
    });

    const result = await runEvolutionRunner({
      baseDir,
      runId: "123e4567-e89b-42d3-a456-426614174401",
      seed: 201,
      config,
      population,
      evaluation,
    });

    assert.ok(result.haltedReason, "should have a haltedReason");
    assert.equal(result.haltedReason.cause, "population-extinction");
  });
});
