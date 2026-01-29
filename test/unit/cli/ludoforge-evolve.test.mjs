import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLudoforgeEvolve } from "../../../src/cli/ludoforge-evolve.js";

function createRunnerConfig() {
  return {
    version: "v1",
    runner: { generations: 1, shortlistSize: 0 },
    mapElites: { descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }] },
  };
}

async function writeConfigFile(baseDir) {
  const configPath = join(baseDir, "runner-config.json");
  await writeFile(configPath, `${JSON.stringify(createRunnerConfig(), null, 2)}\n`, "utf8");
  return configPath;
}

function createEvaluationModule() {
  return {
    evaluator: () => ({ fitness: 1, descriptors: { axis: 0 } }),
  };
}

describe("ludoforge-evolve", () => {
  describe("dry-run", () => {
    it("validates inputs without running the runner or writing metadata", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-"));
      const configPath = await writeConfigFile(baseDir);

      const runId = "123e4567-e89b-42d3-a456-426614174999";
      const population = [{ id: "seed-a", definition: { label: "a" } }];

      const result = await runLudoforgeEvolve({
        argv: [
          "node",
          "ludoforge-evolve",
          "--config",
          configPath,
          "--seeds",
          "./seeds.json",
          "--dry-run",
        ],
        deps: {
          createRunId: () => runId,
          listRuns: async () => [],
          loadSeedPopulation: async () => population,
          writeRunMetadata: () => {
            throw new Error("writeRunMetadata should not run in dry-run");
          },
          runEvolutionRunner: () => {
            throw new Error("runEvolutionRunner should not run in dry-run");
          },
        },
      });

      assert.equal(result.dryRun, true);
      assert.equal(result.runId, runId);
      assert.equal(result.populationSize, population.length);
    });
  });

  describe("resume", () => {
    it("uses loadResumeState and continues from the next generation", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-resume-"));
      const configPath = await writeConfigFile(baseDir);
      const runId = "123e4567-e89b-42d3-a456-426614174111";

      const resumeState = {
        runId,
        generation: 2,
        population: [{ id: "seed-a", definition: { label: "a" } }],
        preferenceModel: { id: "pref-1", version: "v1" },
      };

      let capturedOptions = null;

      await runLudoforgeEvolve({
        argv: [
          "node",
          "ludoforge-evolve",
          "--config",
          configPath,
          "--resume",
          "--run-id",
          runId,
          "--evaluator",
          "./evaluator.js",
        ],
        deps: {
          listRuns: async () => [runId],
          loadResumeState: async () => resumeState,
          loadSeedPopulation: async () => {
            throw new Error("loadSeedPopulation should not run during resume");
          },
          loadEvaluatorModule: async () => createEvaluationModule(),
          runEvolutionRunner: async (options) => {
            capturedOptions = options;
            return { runId: options.runId };
          },
        },
      });

      assert.ok(capturedOptions);
      assert.equal(capturedOptions.runId, runId);
      assert.equal(capturedOptions.startGeneration, 3);
      assert.deepEqual(capturedOptions.population, resumeState.population);
      assert.deepEqual(capturedOptions.preferenceModelSnapshots, [resumeState.preferenceModel]);
    });
  });

  describe("new run", () => {
    it("writes metadata and passes seed population into the runner", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-new-"));
      const configPath = await writeConfigFile(baseDir);
      const runId = "123e4567-e89b-42d3-a456-426614174222";

      const population = [
        { id: "seed-a", definition: { label: "a" } },
        { id: "seed-b", definition: { label: "b" } },
      ];

      let metadataPayload = null;
      let capturedOptions = null;

      await runLudoforgeEvolve({
        argv: [
          "node",
          "ludoforge-evolve",
          "--config",
          configPath,
          "--seeds",
          "./seeds.json",
          "--run-id",
          runId,
          "--evaluator",
          "./evaluator.js",
        ],
        deps: {
          listRuns: async () => [],
          loadSeedPopulation: async () => population,
          loadEvaluatorModule: async () => createEvaluationModule(),
          writeRunMetadata: async (dir, id, metadata) => {
            metadataPayload = { dir, id, metadata };
            return join(dir, "runs", id, "run.json");
          },
          runEvolutionRunner: async (options) => {
            capturedOptions = options;
            return { runId: options.runId };
          },
        },
      });

      assert.ok(metadataPayload);
      assert.equal(metadataPayload.id, runId);
      assert.deepEqual(metadataPayload.metadata.config, createRunnerConfig());

      assert.ok(capturedOptions);
      assert.equal(capturedOptions.runId, runId);
      assert.deepEqual(capturedOptions.population, population);
    });
  });
});
