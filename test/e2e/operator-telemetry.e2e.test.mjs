import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runEvolutionRunner } from "../../src/evolution-runner/runner.js";
import {
  createRunId,
  resolveRunDir,
  resolveRunPath,
  writeRunMetadata,
} from "../../src/evolution-runner/run-layout.js";
import { loadResumeState } from "../../src/evolution-runner/resume-loader.js";
import { createSeededRng } from "../../src/simulation-engine/rng.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function createRunnerConfig() {
  return {
    version: "v1",
    runner: { generations: 1, shortlistSize: 0 },
    mapElites: {
      descriptors: [
        { id: "agency", min: 0, max: 1, bins: 2 },
        { id: "variety", min: 0, max: 1, bins: 2 },
      ],
    },
    evolution: {
      mutation: { rate: 1 },
      crossover: { rate: 0 },
    },
    seed: 7,
  };
}

function createMockEvaluation(seed) {
  const rng = createSeededRng(seed);
  return {
    evaluator() {
      return {
        fitness: rng.next(),
        descriptors: { agency: rng.next(), variety: rng.next() },
        diagnostics: {},
      };
    },
  };
}

function sumAttempts(stats) {
  return Object.values(stats.operators).reduce(
    (total, operator) => total + (operator.attempts ?? 0),
    0,
  );
}

describe("operator telemetry", () => {
  it("persists operator-stats.json and accumulates on resume", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-telemetry-"));
    const runId = createRunId();
    const config = createRunnerConfig();

    await writeRunMetadata(baseDir, runId, { config });

    const definitions = await Promise.all([
      loadFixture("evo-seed-1.json"),
      loadFixture("evo-seed-2.json"),
    ]);

    const population = definitions.map((definition, index) => ({
      id: `seed-${index + 1}`,
      definition,
    }));

    const firstResult = await runEvolutionRunner({
      baseDir,
      runId,
      config,
      population,
      evaluation: createMockEvaluation(7),
      seed: 7,
    });

    const runDir = resolveRunDir(baseDir, runId);
    const statsPath = resolveRunPath(runDir, "generation-0", "operator-stats.json");
    const stats = JSON.parse(await readFile(statsPath, "utf8"));

    const attempts = sumAttempts(stats);
    assert.ok(
      attempts >= firstResult.generations[0].population.length,
      `Expected at least ${firstResult.generations[0].population.length} attempts (one per genome), got ${attempts}`,
    );

    const resumeState = await loadResumeState({ baseDir, runId, config });

    const secondResult = await runEvolutionRunner({
      baseDir,
      runId,
      config,
      population: resumeState.population,
      startGeneration: resumeState.generation + 1,
      evaluation: createMockEvaluation(7),
      seed: 7,
    });

    const statsPath2 = resolveRunPath(runDir, "generation-1", "operator-stats.json");
    const stats2 = JSON.parse(await readFile(statsPath2, "utf8"));

    const attempts2 = sumAttempts(stats2);
    assert.ok(
      attempts2 >= attempts + secondResult.generations[0].population.length,
      `Expected accumulated attempts >= ${attempts + secondResult.generations[0].population.length}, got ${attempts2}`,
    );
  });
});
