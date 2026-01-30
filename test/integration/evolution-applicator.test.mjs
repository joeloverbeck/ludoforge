import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cloneGenome,
  clonePopulation,
  selectMateIndex,
} from "../../src/evolution-runner/population-utils.js";
import { applyEvolution } from "../../src/evolution-runner/evolution-applicator.js";
import { createMutationSelector } from "../../src/evolution-runner/operator-setup.js";
import { defaultMutationOperators } from "../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../src/simulation-engine/rng.js";
import { createTelemetry } from "../../src/evolution-runner/operator-telemetry.js";
import { genomeBasicDefinition } from "./fixtures/index.mjs";

function makePopulation(count) {
  const population = [];
  for (let i = 0; i < count; i += 1) {
    population.push({
      id: `genome-${i}`,
      definition: structuredClone(genomeBasicDefinition),
    });
  }
  return population;
}

describe("evolution-applicator integration", () => {
  describe("cloneGenome and clonePopulation", () => {
    it("cloneGenome produces a deep copy", () => {
      const genome = { id: "g1", definition: structuredClone(genomeBasicDefinition) };
      const clone = cloneGenome(genome);
      assert.deepStrictEqual(clone, genome);
      assert.notEqual(clone, genome);
      assert.notEqual(clone.definition, genome.definition);
    });

    it("clonePopulation produces independent copies", () => {
      const pop = makePopulation(3);
      const cloned = clonePopulation(pop);
      assert.equal(cloned.length, 3);
      cloned.forEach((genome, i) => {
        assert.deepStrictEqual(genome, pop[i]);
        assert.notEqual(genome, pop[i]);
      });
    });
  });

  describe("selectMateIndex", () => {
    it("returns -1 for population of size 1", () => {
      assert.equal(selectMateIndex(1, 0, createSeededRng(42)), -1);
    });

    it("never returns the current index", () => {
      const rng = createSeededRng(42);
      for (let i = 0; i < 50; i += 1) {
        const mate = selectMateIndex(5, 2, rng);
        assert.notEqual(mate, 2);
        assert.ok(mate >= 0 && mate < 5);
      }
    });
  });

  describe("applyEvolution with rate=0 preserves population", () => {
    it("returns identical genomes when both rates are 0", () => {
      const population = makePopulation(3);
      const rng = createSeededRng(42);

      const result = applyEvolution(population, {
        rng,
        mutationRate: 0,
        crossoverRate: 0,
        mutationOperators: defaultMutationOperators,
        mutationSelector: null,
        telemetry: null,
      });

      assert.equal(result.population.length, 3);
      result.population.forEach((genome, i) => {
        assert.deepStrictEqual(genome.definition, population[i].definition);
      });
      result.operatorNames.forEach((name) => {
        assert.equal(name, null);
      });
    });
  });

  describe("applyEvolution with mutation rate=1", () => {
    it("attempts mutation on every genome (real operators, real RNG)", () => {
      const population = makePopulation(4);
      const rng = createSeededRng(99);
      const operatorNames = defaultMutationOperators.map((op) => op.name);
      const telemetry = createTelemetry(operatorNames);
      const selector = createMutationSelector(defaultMutationOperators);

      const result = applyEvolution(population, {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: defaultMutationOperators,
        mutationSelector: selector,
        telemetry,
      });

      assert.equal(result.population.length, 4);

      const totalAttempts = operatorNames.reduce(
        (sum, name) => sum + telemetry.operators[name].attempts,
        0,
      );
      assert.ok(totalAttempts > 0, "At least one mutation attempt should be recorded");
    });
  });

  describe("applyEvolution with crossover rate=1", () => {
    it("applies crossover with mate selection (population size > 1)", () => {
      const population = makePopulation(4);
      const rng = createSeededRng(123);

      const result = applyEvolution(population, {
        rng,
        mutationRate: 0,
        crossoverRate: 1,
        mutationOperators: defaultMutationOperators,
        crossoverOperators: undefined,
        mutationSelector: null,
        telemetry: null,
      });

      assert.equal(result.population.length, 4);
    });
  });

  describe("mutation selector tracks operator names", () => {
    it("operatorNames array contains selected operator names when mutation applied", () => {
      const population = makePopulation(4);
      const rng = createSeededRng(55);
      const operatorNames = defaultMutationOperators.map((op) => op.name);
      const telemetry = createTelemetry(operatorNames);
      const selector = createMutationSelector(defaultMutationOperators);

      const result = applyEvolution(population, {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: defaultMutationOperators,
        mutationSelector: selector,
        telemetry,
      });

      const namedOps = result.operatorNames.filter((n) => n !== null);
      assert.ok(namedOps.length > 0, "Some operators should be named");
      namedOps.forEach((name) => {
        assert.ok(
          operatorNames.includes(name),
          `Operator ${name} should be a known operator`,
        );
      });
    });
  });
});
