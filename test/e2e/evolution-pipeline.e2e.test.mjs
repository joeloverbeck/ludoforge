import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runGenerationLoop } from "../../src/evolutionary-engine/engine.js";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

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

describe("evolution-pipeline", () => {
  describe("happy path", () => {
    it("evaluates all genomes and produces a next generation", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      const evaluation = createEvaluator({ seed: 42, simulationRuns: 2 });

      const result = runGenerationLoop({
        population,
        evaluation,
        mapElites: MAP_ELITES_CONFIG,
        shortlistSize: 0,
      });

      assert.equal(result.evaluated.length, population.length);
      assert.equal(result.rejected.length, 0);

      for (const entry of result.evaluated) {
        assert.equal(typeof entry.fitness, "number");
        assert.ok(Number.isFinite(entry.fitness), `fitness should be finite, got ${entry.fitness}`);
        assert.equal(typeof entry.descriptors, "object");
        assert.ok("agency" in entry.descriptors, "descriptors should include agency");
        assert.ok("variety" in entry.descriptors, "descriptors should include variety");
        assert.equal(typeof entry.diagnostics, "object");
      }

      assert.ok(result.nextGeneration.length >= 1, "MAP-Elites should produce at least one elite");

      const originalIds = new Set(population.map((g) => g.id));
      const nextIds = result.nextGeneration.map((g) => g.id);
      nextIds.forEach((id) => assert.ok(originalIds.has(id)));
    });
  });

  describe("invalid seeds", () => {
    it("evolution pipeline rejects invalid seeds before evaluation runs", async () => {
      const validDefinition = await loadFixture("evo-seed-1.json");
      const invalidDefinition = JSON.parse(JSON.stringify(validDefinition));
      invalidDefinition.termination.conditions = [];
      delete invalidDefinition.termination.maxTurns;

      const population = [
        {
          id: "invalid-seed",
          definition: invalidDefinition,
        },
      ];

      let evaluatorCalls = 0;
      const evaluation = {
        evaluator: () => {
          evaluatorCalls += 1;
          return {
            fitness: 1,
            descriptors: { agency: 0, variety: 0 },
          };
        },
      };

      const result = runGenerationLoop({
        population,
        evaluation,
        mapElites: MAP_ELITES_CONFIG,
      });

      assert.equal(evaluatorCalls, 0);
      assert.equal(result.evaluated.length, 0);
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].genome.id, "invalid-seed");
      assert.equal(result.rejected[0].diagnostics.validation.valid, false);
    });
  });

  describe("safety cutoffs", () => {
    it("evaluates non-terminating fixtures and includes degeneracy diagnostics", async () => {
      const definition = await loadFixture("evo-non-terminating.json");
      const population = [{ id: "seed-cutoff", definition }];

      const evaluation = createEvaluator({ seed: 9, simulationRuns: 2 });

      const result = runGenerationLoop({
        population,
        evaluation,
        mapElites: MAP_ELITES_CONFIG,
      });

      assert.equal(result.evaluated.length, 1);

      const entry = result.evaluated[0];
      assert.equal(typeof entry.fitness, "number");
      assert.ok(Number.isFinite(entry.fitness));

      const evalDiag = entry.diagnostics.evaluation;
      assert.ok(evalDiag.degeneracy, "diagnostics should include degeneracy report");
      assert.ok(Array.isArray(evalDiag.degeneracy.flags), "degeneracy should have flags array");
      assert.ok(evalDiag.logAdapterOk === true, "log adapter should succeed");
      assert.equal(typeof evalDiag.simulationCount, "number");
    });
  });

  describe("determinism", () => {
    it("produces identical results for identical seeds", async () => {
      const definitions = await Promise.all([
        loadFixture("evo-seed-1.json"),
        loadFixture("evo-seed-2.json"),
      ]);

      const population = definitions.map((definition, index) => ({
        id: `seed-${index + 1}`,
        definition,
      }));

      function runOnce() {
        const evaluation = createEvaluator({ seed: 17, simulationRuns: 2 });

        const result = runGenerationLoop({
          population,
          evaluation,
          mapElites: MAP_ELITES_CONFIG,
          shortlistSize: 0,
        });

        return {
          evaluated: result.evaluated.map((entry) => ({
            id: entry.genome.id,
            fitness: entry.fitness,
            descriptors: entry.descriptors,
          })),
          nextIds: result.nextGeneration.map((genome) => genome.id),
        };
      }

      const first = runOnce();
      const second = runOnce();

      assert.deepEqual(first, second);
    });
  });
});
