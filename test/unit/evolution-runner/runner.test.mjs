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
