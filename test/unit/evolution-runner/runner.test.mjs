import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseJsonl } from "../../../src/data-persistence/jsonl.js";
import { readFeedbackJsonl } from "../../../src/data-persistence/feedback-store.js";
import { readPreferenceModelSnapshotJsonl } from "../../../src/data-persistence/preference-model-store.js";
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

  return {
    version: "v1",
    runner,
    mapElites: {
      descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
    },
    ...overrides,
    runner,
  };
}

function createFeedbackRecord(idSuffix) {
  return {
    id: `feedback-${idSuffix}`,
    version: "v1",
    createdAt: new Date(0).toISOString(),
    feedback: {
      type: "rating",
      rating: 4,
      featureVector: {},
    },
  };
}

describe("runner", () => {
  describe("runEvolutionRunner", () => {
    describe("artifact persistence", () => {
      it("persists artifacts for each generation", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-"));
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
          runner: { generations: 2, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174000",
          seed: 17,
          config,
          population,
          evaluation,
        });

        assert.equal(result.generations.length, 2);

        for (const generation of result.generations) {
          await stat(generation.artifacts.generationDir);

          const populationContents = await readFile(generation.artifacts.populationPath, "utf8");
          const populationRecords = parseJsonl(populationContents);
          assert.equal(populationRecords.length, 2);

          const snapshots = await readPreferenceModelSnapshotJsonl(
            generation.artifacts.preferenceModelPath,
          );
          assert.equal(snapshots.length, 1);

          const determinismContents = await readFile(
            generation.artifacts.determinismPath,
            "utf8",
          );
          const determinism = JSON.parse(determinismContents);
          assert.equal(determinism.seed, 17);
        }
      });
    });

    describe("health metrics", () => {
      it("writes health.json for every generation with correct structure", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-health-"));
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
          runner: { generations: 2, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174300",
          seed: 50,
          config,
          population,
          evaluation,
        });

        assert.equal(result.generations.length, 2);

        for (const generation of result.generations) {
          assert.ok(generation.artifacts.healthPath, "health.json should be written");
          const healthContents = await readFile(generation.artifacts.healthPath, "utf8");
          const health = JSON.parse(healthContents);

          assert.ok("meanFitness" in health);
          assert.ok("medianFitness" in health);
          assert.ok("rejectionRate" in health);
          assert.ok("rejectionReasons" in health);
          assert.ok("degeneracyFlags" in health);
          assert.ok("nicheOccupancy" in health);
          assert.ok("repairFailureRate" in health);

          assert.ok(Number.isFinite(health.meanFitness));
          assert.ok(Number.isFinite(health.medianFitness));
          assert.ok(Number.isFinite(health.rejectionRate));
          assert.ok(Number.isFinite(health.nicheOccupancy));
          assert.ok(Number.isFinite(health.repairFailureRate));
        }
      });

      it("computes health metrics correctly from generation results", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-health-vals-"));
        const definition = await loadMinimalDefinition();

        const population = [
          { id: "seed-a", definition },
          { id: "seed-b", definition },
          { id: "seed-c", definition },
        ];

        const evaluation = {
          evaluator: (genome) => {
            if (genome.id === "seed-a") {
              return { fitness: 1, descriptors: { axis: 0 } };
            }
            if (genome.id === "seed-b") {
              return { fitness: 3, descriptors: { axis: 1 } };
            }
            return { fitness: null, descriptors: null };
          },
        };

        const config = createBaseConfig({
          runner: { generations: 1, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174301",
          seed: 51,
          config,
          population,
          evaluation,
        });

        const health = JSON.parse(
          await readFile(result.generations[0].artifacts.healthPath, "utf8"),
        );

        assert.equal(health.meanFitness, 2);
        assert.equal(health.medianFitness, 2);
        assert.equal(health.rejectionRate, 1 / 3);
        assert.ok(health.nicheOccupancy > 0);
      });

      it("reports high rejection rate in health when most genomes rejected", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-health-reject-"));
        const definition = await loadMinimalDefinition();

        const population = [
          { id: "seed-a", definition },
          { id: "seed-b", definition },
          { id: "seed-c", definition },
          { id: "seed-d", definition },
          { id: "seed-e", definition },
        ];

        const evaluation = {
          evaluator: (genome) => {
            if (genome.id === "seed-a") {
              return { fitness: 1, descriptors: { axis: 0.5 } };
            }
            return { fitness: null, descriptors: null };
          },
        };

        const config = createBaseConfig({
          runner: {
            generations: 1,
            shortlistSize: 0,
            maxConsecutiveRejections: 100,
          },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174302",
          seed: 52,
          config,
          population,
          evaluation,
        });

        const health = JSON.parse(
          await readFile(result.generations[0].artifacts.healthPath, "utf8"),
        );

        assert.equal(health.meanFitness, 1);
        assert.equal(health.medianFitness, 1);
        assert.equal(health.rejectionRate, 4 / 5);
        assert.equal(health.nicheOccupancy, 1);
      });
    });

    describe("immutability", () => {
      it("applies evolution without mutating the seed population", async () => {
        const baseDirA = await mkdtemp(join(tmpdir(), "ludoforge-runner-a-"));
        const baseDirB = await mkdtemp(join(tmpdir(), "ludoforge-runner-b-"));
        const definition = await loadMinimalDefinition();

        const population = [
          {
            id: "seed-a",
            definition: {
              ...definition,
              termination: { ...definition.termination, maxTurns: 20 },
            },
          },
          {
            id: "seed-b",
            definition: {
              ...definition,
              termination: { ...definition.termination, maxTurns: 30 },
            },
          },
        ];
        const originalPopulation = structuredClone(population);

        const evaluation = {
          evaluator: (genome) => ({
            fitness: genome.id === "seed-a" ? 1 : 2,
            descriptors: { axis: genome.id === "seed-a" ? 0 : 1 },
          }),
        };

        const mutationOperator = {
          name: "tag",
          mutate: (genome) => {
            const mutated = structuredClone(genome.definition);
            mutated.termination = {
              ...mutated.termination,
              maxTurns: mutated.termination.maxTurns + 1,
            };
            return { ...genome, definition: mutated };
          },
        };

        const crossoverOperator = {
          name: "tag-cross",
          crossover: (parentA, parentB) => {
            const crossed = structuredClone(parentA.definition);
            crossed.termination = {
              ...crossed.termination,
              maxTurns: parentB.definition.termination.maxTurns,
            };
            return { ...parentA, definition: crossed };
          },
        };

        const config = createBaseConfig({
          runner: { generations: 1, shortlistSize: 0 },
          evolution: { mutation: { rate: 1 }, crossover: { rate: 1 } },
        });

        const runOptions = {
          runId: "123e4567-e89b-42d3-a456-426614174001",
          seed: 11,
          config,
          population,
          evaluation,
          mutationOperators: [mutationOperator],
          crossoverOperators: [crossoverOperator],
        };

        const first = await runEvolutionRunner({ baseDir: baseDirA, ...runOptions });
        const second = await runEvolutionRunner({ baseDir: baseDirB, ...runOptions });

        assert.deepEqual(population, originalPopulation);
        assert.deepEqual(first.generations[0].population, second.generations[0].population);

        const maxTurns = first.generations[0].population.map(
          (genome) => genome.definition.termination.maxTurns,
        );
        assert.deepEqual(maxTurns, [31, 21]);
      });
    });

    describe("feedback handling", () => {
      it("ignores feedback when human feedback is disabled", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-feedback-"));
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
          runner: { generations: 1, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
          humanFeedback: { enabled: false },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174010",
          seed: 23,
          config,
          population,
          evaluation,
          feedback: [createFeedbackRecord("disabled")],
        });

        const artifacts = result.generations[0].artifacts;
        assert.ok(!("feedbackPath" in artifacts));
      });

      it("persists feedback when human feedback is enabled", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-feedback-on-"));
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
          runner: { generations: 1, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
          humanFeedback: { enabled: true },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174011",
          seed: 29,
          config,
          population,
          evaluation,
          feedback: [createFeedbackRecord("enabled")],
        });

        const artifacts = result.generations[0].artifacts;
        assert.ok(artifacts.feedbackPath);

        const feedbackRecords = await readFeedbackJsonl(artifacts.feedbackPath);
        assert.equal(feedbackRecords.length, 1);
        assert.equal(feedbackRecords[0].id, "feedback-enabled");
      });
    });

    describe("rejection rate halt", () => {
      it("halts when rejection rate exceeds threshold for consecutive generations", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-halt-"));
        const definition = await loadMinimalDefinition();

        // With mutation rate 0 and MAP-Elites, population shrinks after
        // high-rejection generations. Use maxConsecutiveRejections=1 to
        // halt on the first high-rejection generation.
        const population = [
          { id: "seed-a", definition },
          { id: "seed-b", definition },
          { id: "seed-c", definition },
          { id: "seed-d", definition },
          { id: "seed-e", definition },
        ];

        const config = createBaseConfig({
          runner: {
            generations: 10,
            shortlistSize: 0,
            maxConsecutiveRejections: 1,
            rejectionRateThreshold: 0.5,
          },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const evalSimple = {
          evaluator: (genome) => {
            if (genome.id === "seed-a") {
              return { fitness: 1, descriptors: { axis: 0.5 } };
            }
            return {
              fitness: null,
              descriptors: null,
              diagnostics: { repair: { failed: true } },
            };
          },
        };

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174200",
          seed: 99,
          config,
          population,
          evaluation: evalSimple,
        });

        // Gen 0: 5 genomes, 4 rejected → rate 0.8 > 0.5 → consecutive=1 → halt
        assert.equal(result.generations.length, 1);
        assert.ok(result.haltedReason);
        assert.equal(result.haltedReason.consecutiveHighRejections, 1);
        assert.ok(result.haltedReason.rejectionRate > 0.5);
      });

      it("continues if rejection rate drops below threshold within the window", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-recover-"));
        const definition = await loadMinimalDefinition();

        // Start with 5 genomes. Gen 0: reject 4/5 → rate 0.8 > 0.5.
        // After gen 0, population = 1 elite (seed-a).
        // Gen 1: 1 genome (seed-a), accepted → rate 0.0 → counter resets.
        // With maxConsecutiveRejections=2, it needs 2 consecutive gens above
        // threshold. Gen 0 triggers, gen 1 resets. No halt.
        const population = [
          { id: "seed-a", definition },
          { id: "seed-b", definition },
          { id: "seed-c", definition },
          { id: "seed-d", definition },
          { id: "seed-e", definition },
        ];

        const evaluation = {
          evaluator: (genome) => {
            if (genome.id === "seed-a") {
              return { fitness: 1, descriptors: { axis: 0.5 } };
            }
            return {
              fitness: null,
              descriptors: null,
              diagnostics: { repair: { failed: true } },
            };
          },
        };

        const config = createBaseConfig({
          runner: {
            generations: 4,
            shortlistSize: 0,
            maxConsecutiveRejections: 2,
            rejectionRateThreshold: 0.5,
          },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174201",
          seed: 100,
          config,
          population,
          evaluation,
        });

        // Gen 0: rate 0.8 → consecutive=1
        // Gen 1: population=1 (seed-a only), rate 0.0 → consecutive=0
        // Gen 2: population=1, rate 0.0 → consecutive=0
        // Gen 3: population=1, rate 0.0 → consecutive=0
        // All 4 generations complete
        assert.equal(result.generations.length, 4);
        assert.equal(result.haltedReason, undefined);
      });

      it("continues normally when rejection rate is below threshold", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-normal-"));
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
          runner: { generations: 3, shortlistSize: 0 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174202",
          seed: 101,
          config,
          population,
          evaluation,
        });

        assert.equal(result.generations.length, 3);
        assert.equal(result.haltedReason, undefined);
      });

      it("halt message includes the dominant rejection reason", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-reason-"));
        const definition = await loadMinimalDefinition();

        const population = [
          { id: "seed-a", definition },
          { id: "seed-b", definition },
          { id: "seed-c", definition },
          { id: "seed-d", definition },
          { id: "seed-e", definition },
        ];

        let rejectCount = 0;
        const evaluation = {
          evaluator: (genome) => {
            if (genome.id === "seed-a") {
              return { fitness: 1, descriptors: { axis: 0.5 } };
            }
            rejectCount += 1;
            // 3 out of 4 rejected genomes → evaluation-null (fitness null, descriptors present)
            // 1 out of 4 → evaluation-error (descriptors null triggers adapter error path)
            if (rejectCount % 4 === 0) {
              return { fitness: 1, descriptors: null };
            }
            return { fitness: null, descriptors: { axis: 0 } };
          },
        };

        const config = createBaseConfig({
          runner: {
            generations: 10,
            shortlistSize: 0,
            maxConsecutiveRejections: 1,
            rejectionRateThreshold: 0.5,
          },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const result = await runEvolutionRunner({
          baseDir,
          runId: "123e4567-e89b-42d3-a456-426614174203",
          seed: 102,
          config,
          population,
          evaluation,
        });

        assert.ok(result.haltedReason);
        assert.equal(result.haltedReason.dominantReason, "evaluation-null");
        assert.equal(typeof result.haltedReason.generation, "number");
        assert.equal(typeof result.haltedReason.rejectionRate, "number");
      });
    });

    describe("generation pruning", () => {
      it("retains only the last N generation dirs when maxRetainedGenerations is set", async () => {
        const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-prune-"));
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
          runner: { generations: 5, shortlistSize: 0, maxRetainedGenerations: 2 },
          evolution: { mutation: { rate: 0 }, crossover: { rate: 0 } },
        });

        const runId = "123e4567-e89b-42d3-a456-426614174099";
        const result = await runEvolutionRunner({
          baseDir,
          runId,
          seed: 42,
          config,
          population,
          evaluation,
        });

        assert.equal(result.generations.length, 5);

        const runDir = join(baseDir, "runs", runId);
        const entries = await readdir(runDir);
        const genDirs = entries
          .filter((name) => /^generation-\d+$/.test(name))
          .sort();

        assert.deepStrictEqual(genDirs, ["generation-3", "generation-4"]);
      });
    });
  });
});
