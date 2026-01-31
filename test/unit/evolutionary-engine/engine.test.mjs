import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runGenerationLoop } from "../../../src/evolutionary-engine/engine.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";
import { baseDefinition, missingTerminationDefinition } from "../dsl/fixtures.mjs";

const mapElitesConfig = {
  descriptors: [
    { id: "length", min: 0, max: 100, bins: 5 },
    { id: "randomness", min: 0, max: 1, bins: 4 },
  ],
};

describe("engine", () => {
  describe("runGenerationLoop", () => {
    it("evaluates genomes and skips invalid candidates", async () => {
      const population = [
        { id: "valid", definition: baseDefinition },
        { id: "invalid", definition: missingTerminationDefinition },
      ];

      const result = await runGenerationLoop({
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
  });

  describe("rejection reason categorization", () => {
    const validGenome = { id: "g1", definition: baseDefinition };

    async function loopWithEvaluator(evaluator) {
      return await runGenerationLoop({
        population: [validGenome],
        evaluation: { evaluator },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
    }

    it("assigns 'evaluation-null' when evaluator returns null fitness with valid descriptors", async () => {
      const result = await loopWithEvaluator(() => ({
        fitness: null,
        descriptors: { length: 10, randomness: 0.5 },
      }));
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "evaluation-null");
      assert.equal(result.rejected[0].genome.id, "g1");
    });

    it("assigns 'validation-failure' for invalid genome definitions", async () => {
      const population = [
        { id: "bad", definition: missingTerminationDefinition },
      ];
      const result = await runGenerationLoop({
        population,
        evaluation: {
          evaluator: () => ({
            fitness: 0.5,
            descriptors: { length: 10, randomness: 0.5 },
          }),
        },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "validation-failure");
    });

    it("assigns 'safety-failure' when safety gates reject", async () => {
      const result = await runGenerationLoop({
        population: [validGenome],
        evaluation: {
          evaluator: () => ({
            fitness: 0.5,
            descriptors: { length: 10, randomness: 0.5 },
          }),
          gates: [{ name: "block-all", check: () => false }],
        },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "safety-failure");
    });

    it("assigns 'evaluation-error' when evaluator returns invalid output", async () => {
      const result = await loopWithEvaluator(() => "not-an-object");
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "evaluation-error");
    });

    it("assigns 'repair-failure' when repair fails", async () => {
      const result = await runGenerationLoop({
        population: [validGenome],
        evaluation: {
          evaluator: () => ({
            fitness: 0.5,
            descriptors: { length: 10, randomness: 0.5 },
          }),
          repairOperators: [
            {
              name: "always-fail",
              repair: () => null,
            },
          ],
        },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "repair-failure");
    });

    it("every rejected item has reason and diagnostics fields", async () => {
      const population = [
        { id: "a", definition: baseDefinition },
        { id: "b", definition: missingTerminationDefinition },
      ];
      const result = await runGenerationLoop({
        population,
        evaluation: {
          evaluator: () => ({
            fitness: null,
            descriptors: null,
          }),
        },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
      for (const item of result.rejected) {
        assert.ok(typeof item.reason === "string", "reason must be a string");
        assert.ok("diagnostics" in item, "diagnostics field must exist");
        assert.ok("genome" in item, "genome field must exist");
      }
    });

    it("reason is one of the allowed categories", async () => {
      const allowed = new Set([
        "repair-failure",
        "validation-failure",
        "safety-failure",
        "evaluation-error",
        "evaluation-null",
      ]);
      const result = await runGenerationLoop({
        population: [
          { id: "a", definition: baseDefinition },
          { id: "b", definition: missingTerminationDefinition },
        ],
        evaluation: {
          evaluator: () => ({ fitness: null, descriptors: null }),
        },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
      for (const item of result.rejected) {
        assert.ok(
          allowed.has(item.reason),
          `unexpected reason: ${item.reason}`
        );
      }
    });
  });

  describe("shortlist novelty tie-break", () => {
    it("prefers higher novelty when useNovelty is true and fitness is equal", async () => {
      // Four genomes in different niches, all equal fitness.
      // g1 (bin [0,0]), g2 (bin [1,0]), g3 (bin [1,1]) are clustered.
      // g4 (bin [4,3]) is far from all others → highest novelty.
      // With useNovelty: true and equal fitness, g4 should be picked first.
      const population = [
        { id: "g1", definition: baseDefinition },
        { id: "g2", definition: baseDefinition },
        { id: "g3", definition: baseDefinition },
        { id: "g4", definition: baseDefinition },
      ];

      // Bins for mapElitesConfig: length [0-100, 5 bins], randomness [0-1, 4 bins]
      // g1: length=5 → bin 0, randomness=0.05 → bin 0  → coords [0,0]
      // g2: length=25 → bin 1, randomness=0.05 → bin 0 → coords [1,0]
      // g3: length=25 → bin 1, randomness=0.3 → bin 1  → coords [1,1]
      // g4: length=90 → bin 4, randomness=0.9 → bin 3  → coords [4,3]
      const descriptorsById = {
        g1: { length: 5, randomness: 0.05 },
        g2: { length: 25, randomness: 0.05 },
        g3: { length: 25, randomness: 0.3 },
        g4: { length: 90, randomness: 0.9 },
      };

      const result = await runGenerationLoop({
        population,
        evaluation: {
          evaluator: (genome) => ({
            fitness: 0.5,
            descriptors: descriptorsById[genome.id],
          }),
        },
        mapElites: mapElitesConfig,
        shortlistSize: 2,
        useNovelty: true,
        rng: createSeededRng(42),
      });

      // g4 is the most novel (farthest from the cluster), so with equal
      // fitness it should be sorted first and picked as the initial candidate.
      assert.equal(result.shortlist[0].id, "g4");
      assert.equal(result.shortlist.length, 2);
    });

    it("ignores novelty when useNovelty is false (default)", async () => {
      // Same setup but without novelty. Existing tests still pass and
      // shortlist returns correct count.
      const population = [
        { id: "g1", definition: baseDefinition },
        { id: "g2", definition: baseDefinition },
        { id: "g3", definition: baseDefinition },
        { id: "g4", definition: baseDefinition },
      ];

      const descriptorsById = {
        g1: { length: 5, randomness: 0.05 },
        g2: { length: 25, randomness: 0.05 },
        g3: { length: 25, randomness: 0.3 },
        g4: { length: 90, randomness: 0.9 },
      };

      const withoutNovelty = await runGenerationLoop({
        population,
        evaluation: {
          evaluator: (genome) => ({
            fitness: 0.5,
            descriptors: descriptorsById[genome.id],
          }),
        },
        mapElites: mapElitesConfig,
        shortlistSize: 2,
        rng: createSeededRng(42),
      });

      assert.equal(withoutNovelty.shortlist.length, 2);
      // Without useNovelty, initial pick is by randomKey, not novelty.
      // We just confirm it works and returns valid results.
      for (const genome of withoutNovelty.shortlist) {
        assert.ok(typeof genome.id === "string");
      }
    });

    it("novelty tie-break is deterministic with the same seed", async () => {
      const population = [
        { id: "g1", definition: baseDefinition },
        { id: "g2", definition: baseDefinition },
        { id: "g3", definition: baseDefinition },
      ];

      const descriptorsById = {
        g1: { length: 10, randomness: 0.1 },
        g2: { length: 50, randomness: 0.5 },
        g3: { length: 90, randomness: 0.9 },
      };

      const run = async (seed) =>
        await runGenerationLoop({
          population,
          evaluation: {
            evaluator: (genome) => ({
              fitness: 0.5,
              descriptors: descriptorsById[genome.id],
            }),
          },
          mapElites: mapElitesConfig,
          shortlistSize: 2,
          useNovelty: true,
          rng: createSeededRng(seed),
        });

      const first = await run(99);
      const second = await run(99);

      assert.deepEqual(
        first.shortlist.map((g) => g.id),
        second.shortlist.map((g) => g.id)
      );
    });
  });

  describe("shortlist", () => {
    it("favors diversity after fitness ordering", async () => {
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

      const result = await runGenerationLoop({
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

    it("tie-breaking is deterministic with the same seed", async () => {
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

      const first = await runGenerationLoop({
        population,
        evaluation: { evaluator },
        mapElites: mapElitesConfig,
        shortlistSize: 2,
        rng: createSeededRng(123),
      });

      const second = await runGenerationLoop({
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
  });
});
