import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLudoforgeEvolve } from "../../../src/cli/ludoforge-evolve.js";
import { CLIError } from "../../../src/cli/cli-error.js";

function createRunnerConfig() {
  return {
    runner: { generations: 1, shortlistSize: 0 },
    mapElites: { descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }] },
    seeding: { mode: "folder", populationSize: 1, folder: { path: "./seeds" } },
  };
}

async function writeConfigFile(baseDir) {
  const configPath = join(baseDir, "runner-config.json");
  await writeFile(configPath, `${JSON.stringify(createRunnerConfig(), null, 2)}\n`, "utf8");
  return configPath;
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
        ],
        deps: {
          listRuns: async () => [runId],
          loadResumeState: async () => resumeState,
          loadSeedPopulation: async () => {
            throw new Error("loadSeedPopulation should not run during resume");
          },
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
      assert.ok(capturedOptions.evaluation, "evaluation should be passed to runner");
      assert.equal(typeof capturedOptions.evaluation.evaluator, "function");
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
        ],
        deps: {
          listRuns: async () => [],
          loadSeedPopulation: async () => population,
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
      assert.ok(capturedOptions.evaluation, "evaluation should be passed to runner");
      assert.equal(typeof capturedOptions.evaluation.evaluator, "function");
    });
  });

  describe("--seeds optional with config seeding", () => {
    it("proceeds without --seeds when config has seeding block", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-noseeds-"));
      const configPath = await writeConfigFile(baseDir);
      const runId = "123e4567-e89b-42d3-a456-426614174333";

      let capturedOptions = null;

      await runLudoforgeEvolve({
        argv: [
          "node",
          "ludoforge-evolve",
          "--config",
          configPath,
          "--run-id",
          runId,
        ],
        deps: {
          listRuns: async () => [],
          writeRunMetadata: async () => "ok",
          runEvolutionRunner: async (options) => {
            capturedOptions = options;
            return { runId: options.runId };
          },
        },
      });

      assert.ok(capturedOptions);
      assert.equal(capturedOptions.runId, runId);
      assert.equal(capturedOptions.population, undefined);
      assert.ok(capturedOptions.evaluation);
    });

    it("--seeds takes precedence over config seeding", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-seedsoverride-"));
      const configPath = await writeConfigFile(baseDir);
      const runId = "123e4567-e89b-42d3-a456-426614174444";
      const population = [{ id: "from-file", definition: { label: "file" } }];

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
        ],
        deps: {
          listRuns: async () => [],
          loadSeedPopulation: async () => population,
          writeRunMetadata: async () => "ok",
          runEvolutionRunner: async (options) => {
            capturedOptions = options;
            return { runId: options.runId };
          },
        },
      });

      assert.ok(capturedOptions);
      assert.deepEqual(capturedOptions.population, population);
    });

    it("errors when no --seeds and config has no seeding block", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-noseeding-"));
      const configNoSeeding = {
        runner: { generations: 1, shortlistSize: 0 },
        mapElites: { descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }] },
        seeding: { mode: "folder", populationSize: 1, folder: { path: "./seeds" } },
      };
      const configPath = join(baseDir, "runner-config.json");
      await writeFile(configPath, JSON.stringify(configNoSeeding), "utf8");

      // Mock validateRunnerConfig to accept config without seeding, then
      // remove seeding from parsed config to simulate missing block
      const configWithoutSeeding = {
        runner: { generations: 1, shortlistSize: 0 },
        mapElites: { descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }] },
      };
      const noSeedingConfigPath = join(baseDir, "no-seeding.json");
      await writeFile(noSeedingConfigPath, JSON.stringify(configWithoutSeeding), "utf8");

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: [
              "node",
              "ludoforge-evolve",
              "--config",
              noSeedingConfigPath,
            ],
            deps: {
              validateRunnerConfig: () => ({ valid: true, errors: [] }),
              listRuns: async () => [],
            },
          }),
        (error) => {
          assert.ok(error.message.includes("Missing --seeds"));
          assert.ok(error.message.includes("seeding block"));
          return true;
        },
      );
    });

    it("dry-run reports populationSize from config seeding when --seeds not used", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-dryseeding-"));
      const configPath = await writeConfigFile(baseDir);
      const runId = "123e4567-e89b-42d3-a456-426614174555";

      const result = await runLudoforgeEvolve({
        argv: [
          "node",
          "ludoforge-evolve",
          "--config",
          configPath,
          "--dry-run",
        ],
        deps: {
          createRunId: () => runId,
          listRuns: async () => [],
          writeRunMetadata: () => {
            throw new Error("writeRunMetadata should not run in dry-run");
          },
          runEvolutionRunner: () => {
            throw new Error("runEvolutionRunner should not run in dry-run");
          },
        },
      });

      assert.equal(result.dryRun, true);
      assert.equal(result.populationSize, 1); // matches createRunnerConfig().seeding.populationSize
    });

    it("help text shows --seeds as optional", async () => {
      const result = await runLudoforgeEvolve({
        argv: ["node", "ludoforge-evolve", "--help"],
      });

      assert.ok(result.help);
      assert.ok(!result.message.includes("--seeds <path>     Path to seed population JSON or JSONL\n"),
        "help should not show --seeds as required");
      assert.ok(result.message.includes("[--seeds <path>]"),
        "usage line should show --seeds as optional");
    });
  });

  describe("--evaluator flag removed", () => {
    it("rejects --evaluator as an unknown flag", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-eval-"));
      const configPath = await writeConfigFile(baseDir);

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: [
              "node",
              "ludoforge-evolve",
              "--config",
              configPath,
              "--seeds",
              "./seeds.json",
              "--evaluator",
              "./evaluator.js",
            ],
            deps: {
              listRuns: async () => [],
              loadSeedPopulation: async () => [],
            },
          }),
        (error) => {
          assert.ok(error.message.includes("Unknown flag: --evaluator"));
          return true;
        },
      );
    });

    it("does not mention --evaluator in help output", async () => {
      const result = await runLudoforgeEvolve({
        argv: ["node", "ludoforge-evolve", "--help"],
      });

      assert.ok(result.help);
      assert.ok(!result.message.includes("--evaluator"), "help should not mention --evaluator");
    });
  });

  describe("error messages", () => {
    it("throws CLIError with showUsage when no arguments provided", async () => {
      await assert.rejects(
        () => runLudoforgeEvolve({ argv: ["node", "ludoforge-evolve"] }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("No arguments provided"));
          assert.equal(error.showUsage, true);
          assert.ok(error.hint.includes("--config"));
          return true;
        },
      );
    });

    it("throws CLIError explaining what config is when --config missing with other flags", async () => {
      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--dry-run"],
            deps: { validateRunnerConfig: () => ({ valid: true, errors: [] }) },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Missing required --config"));
          assert.ok(error.message.includes("evolution parameters"));
          assert.equal(error.showUsage, true);
          assert.ok(error.hint.includes("configs/"));
          return true;
        },
      );
    });

    it("throws CLIError with hint when config file not found", async () => {
      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--config", "/nonexistent/path.json"],
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Failed to read config"));
          assert.ok(error.hint.includes("exists"));
          return true;
        },
      );
    });

    it("throws CLIError with linter hint for invalid JSON", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-badjson-"));
      const configPath = join(baseDir, "bad.json");
      await writeFile(configPath, "{ not valid json }", "utf8");

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--config", configPath],
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Invalid JSON"));
          assert.ok(error.hint.includes("linter"));
          return true;
        },
      );
    });

    it("throws CLIError with schema hint for validation failure", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-badschema-"));
      const configPath = join(baseDir, "invalid.json");
      await writeFile(configPath, JSON.stringify({ bad: "config" }), "utf8");

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--config", configPath],
            deps: {
              validateRunnerConfig: () => ({
                valid: false,
                errors: [{ path: "/runner", message: "missing required property" }],
              }),
            },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("validation failed"));
          assert.ok(error.hint.includes("schema"));
          return true;
        },
      );
    });

    it("throws CLIError with showUsage when --resume without --run-id", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-resume-noid-"));
      const configPath = await writeConfigFile(baseDir);

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--config", configPath, "--resume"],
            deps: { listRuns: async () => [] },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("--resume requires --run-id"));
          assert.equal(error.showUsage, true);
          return true;
        },
      );
    });

    it("lists available runs when run ID not found and runs exist", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-notfound-"));
      const configPath = await writeConfigFile(baseDir);
      const existingId = "123e4567-e89b-42d3-a456-426614174aaa";
      const missingId = "123e4567-e89b-42d3-a456-426614174bbb";

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: [
              "node", "ludoforge-evolve",
              "--config", configPath,
              "--resume",
              "--run-id", missingId,
            ],
            deps: { listRuns: async () => [existingId] },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("does not exist"));
          assert.ok(error.hint.includes(existingId));
          return true;
        },
      );
    });

    it("says 'No runs found' when run ID not found and no runs exist", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-noruns-"));
      const configPath = await writeConfigFile(baseDir);
      const missingId = "123e4567-e89b-42d3-a456-426614174ccc";

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: [
              "node", "ludoforge-evolve",
              "--config", configPath,
              "--resume",
              "--run-id", missingId,
            ],
            deps: { listRuns: async () => [] },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.hint.includes("No runs found"));
          return true;
        },
      );
    });

    it("lists valid flags when unknown flag provided", async () => {
      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--bogus"],
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Unknown flag: --bogus"));
          assert.ok(error.message.includes("--config"));
          assert.ok(error.message.includes("--seeds"));
          assert.equal(error.showUsage, true);
          return true;
        },
      );
    });

    it("explains value required when flag value missing", async () => {
      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "--config"],
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("--config"));
          assert.ok(error.message.includes("requires a value"));
          assert.equal(error.showUsage, true);
          return true;
        },
      );
    });

    it("explains positional arguments not accepted", async () => {
      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: ["node", "ludoforge-evolve", "somefile.json"],
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Unexpected argument: somefile.json"));
          assert.ok(error.message.includes("positional"));
          assert.equal(error.showUsage, true);
          return true;
        },
      );
    });

    it("shows UUID hint for invalid run ID format", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-badid-"));
      const configPath = await writeConfigFile(baseDir);

      await assert.rejects(
        () =>
          runLudoforgeEvolve({
            argv: [
              "node", "ludoforge-evolve",
              "--config", configPath,
              "--run-id", "not-a-uuid",
            ],
            deps: { listRuns: async () => [] },
          }),
        (error) => {
          assert.ok(error instanceof CLIError);
          assert.ok(error.message.includes("Invalid run ID format"));
          assert.ok(error.hint.includes("UUID"));
          return true;
        },
      );
    });
  });
});
