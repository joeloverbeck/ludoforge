import { test } from "node:test";
import assert from "node:assert/strict";

import { runGenerationLoop } from "../../src/evolutionary-engine/engine.js";
import { createSeededRng } from "../../src/simulation-engine/rng.js";
import { baseDefinition, missingTerminationDefinition } from "../dsl/fixtures.mjs";

const mapElitesConfig = {
  descriptors: [
    { id: "length", min: 0, max: 100, bins: 5 },
    { id: "randomness", min: 0, max: 1, bins: 4 },
  ],
};

test("generation loop evaluates genomes and skips invalid candidates", () => {
  const population = [
    { id: "valid", definition: baseDefinition },
    { id: "invalid", definition: missingTerminationDefinition },
  ];

  const result = runGenerationLoop({
    population,
    evaluation: {
      evaluator: () => ({ fitness: 0.8, descriptors: { length: 10, randomness: 0.1 } }),
    },
    mapElites: mapElitesConfig,
    shortlistSize: 1,
  });

  assert.equal(result.evaluated.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.mapElites.placements.length, 1);
  assert.equal(result.nextGeneration.length, 1);
  assert.equal(result.shortlist.length, 1);
  assert.equal(result.nextGeneration[0].id, "valid");
  assert.equal(result.shortlist[0].id, "valid");
});

test("shortlist favors diversity after fitness ordering", () => {
  const population = [
    { id: "g1", definition: baseDefinition },
    { id: "g2", definition: baseDefinition },
    { id: "g3", definition: baseDefinition },
  ];

  const descriptorsById = {
    g1: { length: 10, randomness: 0.1 },
    g2: { length: 10, randomness: 0.9 },
    g3: { length: 90, randomness: 0.9 },
  };

  const fitnessById = { g1: 0.9, g2: 0.8, g3: 0.2 };

  const result = runGenerationLoop({
    population,
    evaluation: {
      evaluator: (genome) => ({
        fitness: fitnessById[genome.id],
        descriptors: descriptorsById[genome.id],
      }),
    },
    mapElites: mapElitesConfig,
    shortlistSize: 2,
  });

  assert.deepEqual(
    result.shortlist.map((genome) => genome.id),
    ["g1", "g3"]
  );
});

test("shortlist tie-breaking is deterministic with the same seed", () => {
  const population = [
    { id: "g1", definition: baseDefinition },
    { id: "g2", definition: baseDefinition },
    { id: "g3", definition: baseDefinition },
  ];

  const descriptorsById = {
    g1: { length: 10, randomness: 0.1 },
    g2: { length: 10, randomness: 0.9 },
    g3: { length: 90, randomness: 0.9 },
  };

  const evaluator = (genome) => ({
    fitness: 1,
    descriptors: descriptorsById[genome.id],
  });

  const first = runGenerationLoop({
    population,
    evaluation: { evaluator },
    mapElites: mapElitesConfig,
    shortlistSize: 2,
    rng: createSeededRng(123),
  });

  const second = runGenerationLoop({
    population,
    evaluation: { evaluator },
    mapElites: mapElitesConfig,
    shortlistSize: 2,
    rng: createSeededRng(123),
  });

  assert.deepEqual(
    first.shortlist.map((genome) => genome.id),
    second.shortlist.map((genome) => genome.id)
  );
});
