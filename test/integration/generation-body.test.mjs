import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runEvolutionRunner } from "../../src/evolution-runner/runner.js";
import { buildDebugLog } from "../../src/evolution-runner/generation-body.js";

async function loadMinimalDefinition() {
  const fileUrl = new URL("../unit/fixtures/dsl/valid/minimal.json", import.meta.url);
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

  const baseEvolution = {
    motifMining: {
      enabled: false,
      eliteSelection: { perNicheTopK: 3, globalTopK: 10 },
      minSupport: 2,
      maxMotifLength: 5,
      ngramSizes: [2, 3],
    },
    ...(overrides.evolution ?? {}),
  };

  return {
    version: "v1",
    runner,
    mapElites: {
      descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
    },
    ...overrides,
    runner,
    evolution: baseEvolution,
  };
}

describe("generation-body integration", () => {
  describe("via runEvolutionRunner", () => {
    it("happy path: single generation returns loopResult, evolvedPopulation, artifacts", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-genbody-happy-"));
      const definition = await loadMinimalDefinition();

      const population = [
        { id: "seed-a", definition },
        { id: "seed-b", definition },
      ];

      const evaluation = {
        evaluator: (genome) => ({
          fitness: genome.id === "seed-a" ? 1 : 2,
          descriptors: { axis: genome.id === "seed-a" ? 0 : 1 },
        }),
      };

      const config = createBaseConfig({
        runner: { generations: 1, shortlistSize: 0 },
        evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
      });

      const result = await runEvolutionRunner({
        baseDir,
        runId: "123e4567-e89b-42d3-a456-426614174600",
        seed: 300,
        config,
        population,
        evaluation,
      });

      assert.equal(result.generations.length, 1);
      const gen = result.generations[0];
      assert.ok(gen.population.length > 0, "should have evolved population");
      assert.ok(gen.evaluated.length > 0, "should have evaluated genomes");
      assert.ok(gen.artifacts, "should have artifacts");
      assert.ok(gen.artifacts.generationDir, "should have generation dir");
    });

    it("population extinction: returns halt with correct reason", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-genbody-extinct-"));
      const definition = await loadMinimalDefinition();

      const population = [
        { id: "seed-a", definition },
        { id: "seed-b", definition },
      ];

      let generationCount = 0;
      let callsThisGeneration = 0;

      const evaluation = {
        evaluator: (genome) => {
          callsThisGeneration += 1;
          if (callsThisGeneration > population.length) {
            generationCount += 1;
            callsThisGeneration = 1;
          }
          if (generationCount === 0) {
            return {
              fitness: genome.id === "seed-a" ? 1 : 2,
              descriptors: { axis: genome.id === "seed-a" ? 0 : 1 },
            };
          }
          return { fitness: null, descriptors: null };
        },
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
        runId: "123e4567-e89b-42d3-a456-426614174601",
        seed: 301,
        config,
        population,
        evaluation,
      });

      assert.ok(result.haltedReason, "should have haltedReason");
      assert.equal(result.haltedReason.cause, "population-extinction");
    });

    it("population cap: output capped at maxPopulationSize", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-genbody-cap-"));
      const definition = await loadMinimalDefinition();

      const population = [];
      for (let i = 0; i < 10; i += 1) {
        population.push({ id: `seed-${i}`, definition });
      }

      const evaluation = {
        evaluator: () => ({
          fitness: 1,
          descriptors: { axis: Math.random() },
        }),
      };

      const mutationOperator = {
        name: "identity",
        mutate: (genome) => {
          const mutated = structuredClone(genome.definition);
          return { ...genome, definition: mutated };
        },
      };

      const maxPopulationSize = 12;

      const config = createBaseConfig({
        runner: {
          generations: 2,
          shortlistSize: 0,
          maxPopulationSize,
        },
        evolution: {
          mutation: { rate: 1, offspringPerParent: 2 },
          crossover: { rate: 0 },
        },
      });

      const result = await runEvolutionRunner({
        baseDir,
        runId: "123e4567-e89b-42d3-a456-426614174602",
        seed: 302,
        config,
        population,
        evaluation,
        mutationOperators: [mutationOperator],
        mutationSelector: { pick: () => "identity", observe: () => {} },
      });

      assert.equal(result.generations.length, 2);
      for (const gen of result.generations) {
        assert.ok(
          gen.population.length <= maxPopulationSize,
          `Population ${gen.population.length} exceeds cap ${maxPopulationSize}`,
        );
      }
    });

    it("population replenishment: population padded when below minPopulationSize", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-genbody-replenish-"));
      const definition = await loadMinimalDefinition();

      // Start with 2 genomes, one will be rejected, leaving 1 elite.
      // minPopulationSize=3 should replenish.
      const population = [
        { id: "seed-a", definition },
        { id: "seed-b", definition },
      ];

      const evaluation = {
        evaluator: (genome) => {
          if (genome.id === "seed-a") {
            return { fitness: 1, descriptors: { axis: 0.5 } };
          }
          // Accept all genomes to avoid extinction, but MAP-Elites
          // may reduce population. Use fitness to control selection.
          return { fitness: 0.5, descriptors: { axis: 0.5 } };
        },
      };

      const config = createBaseConfig({
        runner: {
          generations: 1,
          shortlistSize: 0,
          minPopulationSize: 5,
        },
        evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
      });

      const result = await runEvolutionRunner({
        baseDir,
        runId: "123e4567-e89b-42d3-a456-426614174603",
        seed: 303,
        config,
        population,
        evaluation,
      });

      assert.equal(result.generations.length, 1);
      // Population should be at least minPopulationSize
      assert.ok(
        result.generations[0].population.length >= 5,
        `Population ${result.generations[0].population.length} should be >= 5 after replenishment`,
      );
    });

    it("debug log structure: artifacts include debug log with expected keys", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-genbody-debug-"));
      const definition = await loadMinimalDefinition();

      const population = [
        { id: "seed-a", definition },
        { id: "seed-b", definition },
      ];

      const evaluation = {
        evaluator: (genome) => ({
          fitness: genome.id === "seed-a" ? 1 : 2,
          descriptors: { axis: genome.id === "seed-a" ? 0 : 1 },
        }),
      };

      const config = createBaseConfig({
        runner: { generations: 1, shortlistSize: 0 },
        evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
      });

      const result = await runEvolutionRunner({
        baseDir,
        runId: "123e4567-e89b-42d3-a456-426614174604",
        seed: 304,
        config,
        population,
        evaluation,
      });

      assert.equal(result.generations.length, 1);
      const artifacts = result.generations[0].artifacts;
      assert.ok(artifacts.debugLogPath, "should write debug log");

      const debugLog = JSON.parse(await readFile(artifacts.debugLogPath, "utf8"));
      assert.equal(typeof debugLog.generation, "number");
      assert.equal(typeof debugLog.timestamp, "string");
      assert.equal(typeof debugLog.populationSize, "number");
      assert.equal(typeof debugLog.evaluatedCount, "number");
      assert.equal(typeof debugLog.rejectedCount, "number");
      assert.ok(Array.isArray(debugLog.rejectionReasons));
      assert.ok(Array.isArray(debugLog.evaluatedSummary));
    });
  });

  describe("buildDebugLog", () => {
    it("returns correct structure from loop result data", () => {
      const loopResult = {
        evaluated: [
          { genome: { id: "g1" }, fitness: 5 },
          { genome: { id: "g2" }, fitness: 3 },
        ],
        rejected: [
          { genome: { id: "g3" }, reason: "evaluation-null" },
        ],
      };

      const result = buildDebugLog({
        generation: 7,
        evolvedPopulation: [{ id: "g1" }, { id: "g2" }],
        loopResult,
      });

      assert.equal(result.generation, 7);
      assert.equal(typeof result.timestamp, "string");
      assert.equal(result.populationSize, 2);
      assert.equal(result.evaluatedCount, 2);
      assert.equal(result.rejectedCount, 1);
      assert.deepEqual(result.rejectionReasons, [
        { genomeId: "g3", reason: "evaluation-null" },
      ]);
      assert.deepEqual(result.evaluatedSummary, [
        { genomeId: "g1", fitness: 5 },
        { genomeId: "g2", fitness: 3 },
      ]);
    });

    it("handles null genome ids gracefully", () => {
      const loopResult = {
        evaluated: [{ genome: null, fitness: 1 }],
        rejected: [{ genome: null, reason: "error" }],
      };

      const result = buildDebugLog({
        generation: 0,
        evolvedPopulation: [],
        loopResult,
      });

      assert.equal(result.rejectionReasons[0].genomeId, null);
      assert.equal(result.evaluatedSummary[0].genomeId, null);
    });

    it("handles empty evaluated and rejected arrays", () => {
      const loopResult = {
        evaluated: [],
        rejected: [],
      };

      const result = buildDebugLog({
        generation: 0,
        evolvedPopulation: [],
        loopResult,
      });

      assert.equal(result.evaluatedCount, 0);
      assert.equal(result.rejectedCount, 0);
      assert.deepEqual(result.rejectionReasons, []);
      assert.deepEqual(result.evaluatedSummary, []);
    });
  });
});
