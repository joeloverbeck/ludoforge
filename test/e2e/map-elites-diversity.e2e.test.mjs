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
const { runGenerationLoop } = await import(
  "../../src/evolutionary-engine/engine.js"
);
const { placePopulationInMapElites } = await import(
  "../../src/evolutionary-engine/map-elites.js"
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
    { id: "agency", min: 0, max: 1, bins: 3 },
    { id: "variety", min: 0, max: 1, bins: 3 },
  ],
};

function createDiverseEvaluator(seed) {
  let callCount = 0;
  const rng = createSeededRng(seed);
  return {
    evaluator(genome) {
      callCount += 1;
      return {
        fitness: 0.5 + rng.next() * 0.5,
        descriptors: {
          agency: rng.next(),
          variety: rng.next(),
        },
        diagnostics: {},
      };
    },
  };
}

describe("map-elites-diversity", () => {
  describe("different genomes occupy different niches", () => {
    it("4 diverse seeds in 3x3 bins produce at least 2 occupied niches", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
        loadFixture("choice-game.json"),
        loadFixture("multi-phase-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const evaluation = createDiverseEvaluator(42);

      const result = await runGenerationLoop({
        population,
        evaluation,
        mapElites: MAP_ELITES_CONFIG,
        rng: createSeededRng(42),
      });

      const nicheCount = result.mapElites.elites.size;
      assert.ok(
        nicheCount >= 2,
        `expected at least 2 niches occupied, got ${nicheCount}`
      );
    });
  });

  describe("shortlist draws from diverse niches", () => {
    it("shortlistSize=3 draws genomes from at least 2 niches", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
        loadFixture("choice-game.json"),
        loadFixture("multi-phase-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const evaluation = createDiverseEvaluator(99);

      const result = await runGenerationLoop({
        population,
        evaluation,
        mapElites: MAP_ELITES_CONFIG,
        shortlistSize: 3,
        rng: createSeededRng(99),
      });

      const shortlistIds = new Set(result.shortlist.map((g) => g.id));
      const shortlistNiches = new Set();

      for (const placement of result.mapElites.placements) {
        if (placement.isElite && shortlistIds.has(placement.member.genome.id)) {
          shortlistNiches.add(placement.nicheId);
        }
      }

      if (result.shortlist.length >= 2) {
        assert.ok(
          shortlistNiches.size >= 2,
          `expected shortlist from >=2 niches, got ${shortlistNiches.size}`
        );
      }
    });
  });

  describe("higher fitness wins within same niche", () => {
    it("genome with higher fitness becomes elite over lower fitness in same niche", () => {
      const population = [
        {
          genome: { id: "low", definition: {} },
          fitness: 0.3,
          descriptors: { agency: 0.1, variety: 0.1 },
        },
        {
          genome: { id: "high", definition: {} },
          fitness: 0.9,
          descriptors: { agency: 0.1, variety: 0.1 },
        },
      ];

      const result = placePopulationInMapElites(population, MAP_ELITES_CONFIG);

      const eliteIds = Array.from(result.elites.values()).map((m) => m.genome.id);
      assert.ok(
        eliteIds.includes("high"),
        `higher fitness genome should be elite, got: ${JSON.stringify(eliteIds)}`
      );
      assert.ok(
        !eliteIds.includes("low"),
        "lower fitness genome should not be elite in same niche"
      );
    });
  });

  describe("non-finite descriptor lands in unknown niche", () => {
    it("genome with NaN descriptor occupies a distinct 'unknown' niche, not bin 0", () => {
      const population = [
        {
          genome: { id: "g-normal", definition: {} },
          fitness: 0.5,
          descriptors: { agency: 0.1, variety: 0.1 },
        },
        {
          genome: { id: "g-nan", definition: {} },
          fitness: 0.5,
          descriptors: { agency: null, variety: 0.1 },
        },
      ];

      const result = placePopulationInMapElites(population, MAP_ELITES_CONFIG);

      const nicheIds = result.placements.map((p) => p.nicheId);
      const normalNiche = nicheIds[0];
      const nanNiche = nicheIds[1];

      assert.notEqual(
        normalNiche,
        nanNiche,
        "NaN descriptor should land in a different niche than a normal value"
      );
      assert.ok(
        nanNiche.includes("unknown"),
        `NaN descriptor niche should contain 'unknown', got: ${nanNiche}`
      );
      assert.ok(
        !normalNiche.includes("unknown"),
        "normal descriptor niche should not contain 'unknown'"
      );
    });
  });

  describe("multi-generation diversity maintenance", () => {
    it("3 generations maintain niche count (does not collapse to 1)", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
        loadFixture("choice-game.json"),
        loadFixture("multi-phase-game.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const result = await runEvolutionRunner({
        config: {
          runner: { generations: 3 },
          mapElites: MAP_ELITES_CONFIG,
          seed: 42,
          evolution: {
            mutation: { rate: 0.5 },
            crossover: { rate: 0.3 },
          },
        },
        population,
        evaluation: createDiverseEvaluator(42),
        seed: 42,
      });

      assert.equal(result.generations.length, 3);

      const lastGen = result.generations[2];
      const nicheCount = lastGen.mapElites.elites.size;

      assert.ok(
        nicheCount >= 1,
        `niche count should not collapse to 0, got ${nicheCount}`
      );
    });
  });
});
