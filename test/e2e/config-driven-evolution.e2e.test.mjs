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

describe("config-driven-evolution", () => {
  describe("mutation rate 0 vs 1", () => {
    it("rate=0 preserves definitions, rate=1 produces novel ones", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const resultZero = await runEvolutionRunner({
        config: {
          runner: { generations: 1 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        },
        population: structuredClone(population),
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const resultOne = await runEvolutionRunner({
        config: {
          runner: { generations: 1 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 1.0 }, crossover: { rate: 0 } },
        },
        population: structuredClone(population),
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const genZero = resultZero.generations[0];
      const genOne = resultOne.generations[0];

      // rate=0: evolved defs should match MAP-Elites output exactly
      const eliteDefs = new Set(
        Array.from(genZero.mapElites.elites.values()).map((m) =>
          JSON.stringify(m.genome.definition)
        )
      );
      const evolvedDefsZero = genZero.population.map((g) =>
        JSON.stringify(g.definition)
      );
      for (const def of evolvedDefsZero) {
        assert.ok(
          eliteDefs.has(def),
          "rate=0 should preserve MAP-Elites definitions"
        );
      }

      // rate=1: at least some should differ from MAP-Elites output
      const eliteDefsOne = new Set(
        Array.from(genOne.mapElites.elites.values()).map((m) =>
          JSON.stringify(m.genome.definition)
        )
      );
      const evolvedDefsOne = genOne.population.map((g) =>
        JSON.stringify(g.definition)
      );
      const anyNovel = evolvedDefsOne.some((d) => !eliteDefsOne.has(d));
      assert.ok(
        anyNovel,
        "rate=1 should produce at least some novel definitions"
      );
    });
  });

  describe("shortlist size respected", () => {
    it("shortlistSize=1 produces shortlist of exactly 1", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 1, shortlistSize: 1 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];
      assert.equal(
        gen.shortlist.length,
        1,
        `shortlist should have exactly 1 entry, got ${gen.shortlist.length}`
      );
    });

    it("shortlistSize=4 produces shortlist capped by elite count", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
        loadFixture("choice-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 1, shortlistSize: 4 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];
      const eliteCount = gen.mapElites.elites.size;
      assert.ok(
        gen.shortlist.length <= Math.min(4, eliteCount),
        `shortlist (${gen.shortlist.length}) should be <= min(4, ${eliteCount})`
      );
      assert.ok(
        gen.shortlist.length > 0,
        "shortlist should have at least 1 entry"
      );
    });
  });

  describe("generation count respected", () => {
    it("generations=1 produces exactly 1 generation result", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const population = [{ id: "seed-1", definition }];

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 1 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      assert.equal(result.generations.length, 1);
    });

    it("generations=3 produces exactly 3 generation results", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const population = [{ id: "seed-1", definition }];

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 3 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      assert.equal(result.generations.length, 3);
    });
  });

  describe("invalid config rejected", () => {
    it("generations=0 throws an error", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const population = [{ id: "seed-1", definition }];

      await assert.rejects(
        () =>
          runEvolutionRunner({
            config: {
              runner: { generations: 0 },
              mapElites: MAP_ELITES_CONFIG,
              evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
            },
            population,
            evaluation: createFastMockEvaluator(42),
          }),
        /generations must be a positive integer/
      );
    });

    it("negative mutation rate throws an error", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const population = [{ id: "seed-1", definition }];

      await assert.rejects(
        () =>
          runEvolutionRunner({
            config: {
              runner: { generations: 1 },
              mapElites: MAP_ELITES_CONFIG,
              evolution: { mutation: { rate: -0.5 }, crossover: { rate: 0 } },
            },
            population,
            evaluation: createFastMockEvaluator(42),
          }),
        /must be between 0 and 1/
      );
    });
  });
});
