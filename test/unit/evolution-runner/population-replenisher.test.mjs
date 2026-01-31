import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { replenishPopulation } from "../../../src/evolution-runner/population-replenisher.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

describe("replenishPopulation", () => {
  it("returns population unchanged when at or above minSize", () => {
    const population = [
      { id: "g1", definition: {} },
      { id: "g2", definition: {} },
    ];
    const result = replenishPopulation(population, {
      minSize: 2,
      rng: createSeededRng(42),
    });
    assert.equal(result.population.length, 2);
    assert.equal(result.injectedCount, 0);
  });

  it("injects genomes to reach minSize", () => {
    const population = [{ id: "g1", definition: {} }];
    const rng = createSeededRng(42);
    const result = replenishPopulation(population, {
      minSize: 4,
      rng,
    });
    assert.ok(result.population.length >= 2, "should inject at least some genomes");
    assert.ok(result.injectedCount >= 1, "injectedCount should be >= 1");
    // Original genome is preserved.
    assert.equal(result.population[0].id, "g1");
  });

  it("injected genomes have valid ids", () => {
    const population = [];
    const rng = createSeededRng(99);
    const result = replenishPopulation(population, {
      minSize: 3,
      rng,
    });
    for (const genome of result.population) {
      assert.ok(typeof genome.id === "string" && genome.id.length > 0);
      assert.ok(genome.definition !== null && typeof genome.definition === "object");
    }
  });

  it("returns unchanged when minSize is not a positive integer", () => {
    const population = [{ id: "g1", definition: {} }];
    const result = replenishPopulation(population, {
      minSize: undefined,
      rng: createSeededRng(1),
    });
    assert.equal(result.injectedCount, 0);
  });

  it("does not mutate the input population array", () => {
    const population = [{ id: "g1", definition: {} }];
    const original = [...population];
    replenishPopulation(population, {
      minSize: 5,
      rng: createSeededRng(42),
    });
    assert.equal(population.length, original.length);
  });
});
