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
    it("evaluates genomes and skips invalid candidates", () => {
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
  });

  describe("rejection reason categorization", () => {
    const validGenome = { id: "g1", definition: baseDefinition };

    function loopWithEvaluator(evaluator) {
      return runGenerationLoop({
        population: [validGenome],
        evaluation: { evaluator },
        mapElites: mapElitesConfig,
        shortlistSize: 0,
      });
    }

    it("assigns 'evaluation-null' when evaluator returns null fitness with valid descriptors", () => {
      const result = loopWithEvaluator(() => ({
        fitness: null,
        descriptors: { length: 10, randomness: 0.5 },
      }));
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "evaluation-null");
      assert.equal(result.rejected[0].genome.id, "g1");
    });

    it("assigns 'validation-failure' for invalid genome definitions", () => {
      const population = [
        { id: "bad", definition: missingTerminationDefinition },
      ];
      const result = runGenerationLoop({
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

    it("assigns 'safety-failure' when safety gates reject", () => {
      const result = runGenerationLoop({
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

    it("assigns 'evaluation-error' when evaluator returns invalid output", () => {
      const result = loopWithEvaluator(() => "not-an-object");
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].reason, "evaluation-error");
    });

    it("assigns 'repair-failure' when repair fails", () => {
      const result = runGenerationLoop({
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

    it("every rejected item has reason and diagnostics fields", () => {
      const population = [
        { id: "a", definition: baseDefinition },
        { id: "b", definition: missingTerminationDefinition },
      ];
      const result = runGenerationLoop({
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

    it("reason is one of the allowed categories", () => {
      const allowed = new Set([
        "repair-failure",
        "validation-failure",
        "safety-failure",
        "evaluation-error",
        "evaluation-null",
      ]);
      const result = runGenerationLoop({
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

  describe("shortlist", () => {
    it("favors diversity after fitness ordering", () => {
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

    it("tie-breaking is deterministic with the same seed", () => {
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
  });
});
