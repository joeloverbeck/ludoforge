import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

describe("runner population cap", () => {
  it("caps population at maxPopulationSize across multiple generations", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-cap-"));
    const definition = await loadMinimalDefinition();

    const population = [];
    for (let i = 0; i < 10; i += 1) {
      population.push({ id: `seed-${i}`, definition });
    }

    const evaluation = {
      evaluator: (genome) => ({
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

    const maxPopulationSize = 15;

    const config = createBaseConfig({
      runner: {
        generations: 3,
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
      runId: "123e4567-e89b-42d3-a456-426614174500",
      seed: 77,
      config,
      population,
      evaluation,
      mutationOperators: [mutationOperator],
      mutationSelector: { pick: () => "identity", observe: () => {} },
    });

    assert.equal(result.generations.length, 3);

    for (const gen of result.generations) {
      assert.ok(
        gen.population.length <= maxPopulationSize,
        `Population ${gen.population.length} exceeds cap ${maxPopulationSize} at generation ${gen.generation}`,
      );
    }
  });

  it("falls back to seeding.populationSize when maxPopulationSize is absent", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-cap-seed-"));
    const definition = await loadMinimalDefinition();

    const population = [];
    for (let i = 0; i < 8; i += 1) {
      population.push({ id: `seed-${i}`, definition });
    }

    const evaluation = {
      evaluator: (genome) => ({
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

    const config = createBaseConfig({
      runner: {
        generations: 2,
        shortlistSize: 0,
        // no maxPopulationSize — should fall back to seeding.populationSize
      },
      seeding: { populationSize: 10 },
      evolution: {
        mutation: { rate: 1, offspringPerParent: 2 },
        crossover: { rate: 0 },
      },
    });

    const result = await runEvolutionRunner({
      baseDir,
      runId: "123e4567-e89b-42d3-a456-426614174501",
      seed: 78,
      config,
      population,
      evaluation,
      mutationOperators: [mutationOperator],
      mutationSelector: { pick: () => "identity", observe: () => {} },
    });

    assert.equal(result.generations.length, 2);

    for (const gen of result.generations) {
      assert.ok(
        gen.population.length <= 10,
        `Population ${gen.population.length} exceeds seeding cap 10 at generation ${gen.generation}`,
      );
    }
  });

  it("does not truncate when population is below the cap", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-cap-noop-"));
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
      runner: {
        generations: 1,
        shortlistSize: 0,
        maxPopulationSize: 100,
      },
      evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
    });

    const result = await runEvolutionRunner({
      baseDir,
      runId: "123e4567-e89b-42d3-a456-426614174502",
      seed: 79,
      config,
      population,
      evaluation,
    });

    assert.equal(result.generations[0].population.length, 2);
  });
});
