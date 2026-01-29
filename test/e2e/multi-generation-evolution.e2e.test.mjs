import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Must mock writeGenerationArtifacts BEFORE importing runner
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
const { createSeededRng } = await import(
  "../../src/simulation-engine/rng.js"
);
const { validateGenomeDefinition } = await import(
  "../../src/evolutionary-engine/serialization.js"
);

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

const MAP_ELITES_CONFIG = {
  descriptors: [
    { id: "agency", min: 0, max: 1, bins: 2 },
    { id: "variety", min: 0, max: 1, bins: 2 },
  ],
};

function createFastMockEvaluator(seed) {
  const rng = createSeededRng(seed);
  return {
    evaluator(genome) {
      return {
        fitness: rng.next(),
        descriptors: { agency: rng.next(), variety: rng.next() },
        diagnostics: {},
      };
    },
  };
}

describe("multi-generation-evolution", () => {
  describe("two-generation happy path", () => {
    it("runs 2 generations with 2 seeds and returns valid results", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 2 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: {
            mutation: { rate: 0 },
            crossover: { rate: 0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      assert.equal(result.generations.length, 2, "should produce 2 generation results");
      assert.ok(result.runId, "should have a run ID");

      for (const gen of result.generations) {
        assert.ok(Array.isArray(gen.population), "generation should have a population");
        assert.ok(gen.population.length > 0, "population should be non-empty");
        assert.ok(Array.isArray(gen.evaluated), "generation should have evaluated");

        for (const genome of gen.population) {
          assert.ok(genome.id, "genome should have an id");
          assert.ok(genome.definition, "genome should have a definition");
          const validation = validateGenomeDefinition(genome.definition);
          assert.ok(
            validation.valid,
            `genome ${genome.id} should be valid: ${JSON.stringify(validation.errors || validation.issues)}`
          );
        }
      }
    });
  });

  describe("determinism", () => {
    it("produces identical results when run twice with same inputs", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      async function runOnce() {
        const result = await runEvolutionRunner({
          config: {
            runner: { generations: 2 },
            mapElites: MAP_ELITES_CONFIG,
            seed: 17,
            evolution: {
              mutation: { rate: 0 },
              crossover: { rate: 0 },
            },
          },
          population: structuredClone(population),
          evaluation: createFastMockEvaluator(17),
          seed: 17,
        });

        return result.generations.map((gen) => ({
          evaluated: gen.evaluated.map((e) => ({
            id: e.genome.id,
            fitness: e.fitness,
            descriptors: e.descriptors,
          })),
          populationIds: gen.population.map((g) => g.id),
        }));
      }

      const first = await runOnce();
      const second = await runOnce();

      assert.deepEqual(first, second, "two runs with identical inputs should produce identical results");
    });
  });

  describe("zero rates preserve population", () => {
    it("mutation=0, crossover=0 produces definitions identical to MAP-Elites output", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 1 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: {
            mutation: { rate: 0 },
            crossover: { rate: 0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];
      const evolvedDefs = gen.population.map((g) => JSON.stringify(g.definition));
      const mapElitesDefs = Array.from(gen.mapElites.elites.values()).map((m) =>
        JSON.stringify(m.genome.definition)
      );

      const evolvedSet = new Set(evolvedDefs);
      const mapElitesSet = new Set(mapElitesDefs);

      assert.equal(
        evolvedSet.size,
        mapElitesSet.size,
        "evolved population size should match MAP-Elites output"
      );
      for (const def of mapElitesSet) {
        assert.ok(
          evolvedSet.has(def),
          "every MAP-Elites genome should appear in evolved population"
        );
      }
    });
  });

  describe("population size preserved", () => {
    it("output population length matches MAP-Elites elite count", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 2 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: {
            mutation: { rate: 0 },
            crossover: { rate: 0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      for (const gen of result.generations) {
        const eliteCount = gen.mapElites.elites.size;
        assert.equal(
          gen.population.length,
          eliteCount,
          `population length (${gen.population.length}) should match elite count (${eliteCount})`
        );
      }
    });
  });
});
