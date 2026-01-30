import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { runLudoforgeEvolve } from "../../src/cli/ludoforge-evolve.js";

const execFileAsync = promisify(execFile);
const CLI_PATH = resolve("src/cli/ludoforge-evolve.js");

function createRunnerConfig() {
  return {
    runner: { generations: 1, shortlistSize: 0, maxRetainedGenerations: 5 },
    mapElites: { descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }] },
    humanFeedback: { enabled: false, mode: "comparison" },
    seeding: { mode: "folder", populationSize: 1, folder: { path: "./seeds" } },
  };
}

async function writeConfigFile(baseDir) {
  const configPath = join(baseDir, "runner-config.json");
  await writeFile(configPath, JSON.stringify(createRunnerConfig(), null, 2), "utf8");
  return configPath;
}

describe("CLI runner paths (integration)", () => {
  it("successful new run with real config validation", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-int-"));
    const configPath = await writeConfigFile(baseDir);
    const runId = "123e4567-e89b-42d3-a456-426614174000";
    const population = [{ id: "seed-a", definition: { label: "a" } }];

    let capturedOptions = null;

    const result = await runLudoforgeEvolve({
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

    assert.equal(result.dryRun, false);
    assert.equal(result.resumed, false);
    assert.equal(result.runId, runId);
    assert.ok(capturedOptions);
    assert.equal(typeof capturedOptions.evaluation.evaluator, "function");
    assert.deepEqual(capturedOptions.population, population);
  });

  it("resume dry-run with real config validation", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cli-int-resume-"));
    const configPath = await writeConfigFile(baseDir);
    const runId = "123e4567-e89b-42d3-a456-426614174111";

    const result = await runLudoforgeEvolve({
      argv: [
        "node",
        "ludoforge-evolve",
        "--config",
        configPath,
        "--resume",
        "--run-id",
        runId,
        "--dry-run",
      ],
      deps: {
        listRuns: async () => [runId],
        loadResumeState: async () => ({
          runId,
          generation: 2,
          population: [{ id: "g", definition: {} }],
          preferenceModel: null,
        }),
      },
    });

    assert.equal(result.dryRun, true);
    assert.equal(result.resumed, true);
    assert.equal(result.runId, runId);
  });

  it("help output through subprocess", async () => {
    const { stdout } = await execFileAsync("node", [CLI_PATH, "--help"], {
      timeout: 10_000,
    });

    assert.ok(stdout.includes("Usage:"), "stdout should contain usage text");
    assert.ok(stdout.includes("--config"), "stdout should mention --config");
    assert.ok(stdout.includes("--seeds"), "stdout should mention --seeds");
    assert.ok(stdout.includes("--resume"), "stdout should mention --resume");
  });
});
