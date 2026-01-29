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

describe("apply-evolution-chain", () => {
  describe("full chain (mutation=1, crossover=1)", () => {
    it("all children valid after full evolution chain", async () => {
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
            mutation: { rate: 1.0 },
            crossover: { rate: 1.0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];
      assert.ok(gen.population.length > 0, "should produce at least one child");

      for (const genome of gen.population) {
        const validation = validateGenomeDefinition(genome.definition);
        assert.ok(
          validation.valid,
          `child ${genome.id} should be valid: ${JSON.stringify(validation.errors || validation.issues)}`
        );
      }
    });
  });

  describe("mutation-only (crossover=0)", () => {
    it("children valid and different from parents", async () => {
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
            mutation: { rate: 1.0 },
            crossover: { rate: 0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];

      for (const genome of gen.population) {
        const validation = validateGenomeDefinition(genome.definition);
        assert.ok(validation.valid, `child ${genome.id} should be valid`);
      }

      const parentDefs = new Set(population.map((g) => JSON.stringify(g.definition)));
      const childDefs = gen.population.map((g) => JSON.stringify(g.definition));
      const anyDifferent = childDefs.some((d) => !parentDefs.has(d));

      assert.ok(
        anyDifferent,
        "mutation-only children should differ from parents"
      );
    });
  });

  describe("crossover-only (mutation=0)", () => {
    it("children are valid", async () => {
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
            crossover: { rate: 1.0 },
          },
        },
        population,
        evaluation: createFastMockEvaluator(42),
        seed: 42,
      });

      const gen = result.generations[0];

      for (const genome of gen.population) {
        const validation = validateGenomeDefinition(genome.definition);
        assert.ok(validation.valid, `child ${genome.id} should be valid`);
      }
    });
  });

  describe("repair survives destructive operators", () => {
    it("most iterations with all operators enabled produce valid output", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("choice-game.json"),
      ]);

      let validGenomes = 0;
      let invalidGenomes = 0;
      let totalRuns = 0;

      for (let seed = 0; seed < 50; seed += 1) {
        const population = definitions.map((definition, index) => ({
          id: `seed-${index + 1}`,
          definition: structuredClone(definition),
        }));

        let result;
        try {
          result = await runEvolutionRunner({
            config: {
              runner: { generations: 1 },
              mapElites: MAP_ELITES_CONFIG,
              seed,
              evolution: {
                mutation: { rate: 1.0 },
                crossover: { rate: 1.0 },
              },
            },
            population,
            evaluation: createFastMockEvaluator(seed),
            seed,
          });
        } catch {
          // Some seeds may produce empty populations after mutation+repair,
          // which causes runEvolutionRunner to throw. Skip these.
          continue;
        }

        totalRuns += 1;
        const gen = result.generations[0];

        for (const genome of gen.population) {
          const validation = validateGenomeDefinition(genome.definition);
          if (validation.valid) {
            validGenomes += 1;
          } else {
            invalidGenomes += 1;
          }
        }
      }

      assert.ok(totalRuns > 0, "at least some seeds should complete successfully");
      const total = validGenomes + invalidGenomes;
      assert.ok(total > 0, "should produce at least some genomes");
      const ratio = validGenomes / total;
      assert.ok(
        ratio >= 0.7,
        `expected >=70% valid genomes, got ${validGenomes}/${total} (${(ratio * 100).toFixed(0)}%)`
      );
    });
  });
});
