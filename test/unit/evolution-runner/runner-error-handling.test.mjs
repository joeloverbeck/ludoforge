import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runEvolutionRunner } from "../../../src/evolution-runner/runner.js";

async function loadMinimalDefinition() {
  const fileUrl = new URL("../fixtures/dsl/valid/minimal.json", import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function createBaseConfig(overrides = {}) {
  const baseRunner = {
    generations: 3,
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
    evolution: {
      motifMining: {
        enabled: false,
        eliteSelection: { perNicheTopK: 3, globalTopK: 10 },
        minSupport: 2,
        maxMotifLength: 5,
        ngramSizes: [2, 3],
      },
      mutation: { rate: 0 },
      crossover: { rate: 0 },
      ...(overrides.evolution ?? {}),
    },
  };
}

describe("runner error handling", () => {
  it("catches generation errors and returns haltedReason with generation-error cause", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-err-"));
    const definition = await loadMinimalDefinition();

    const population = [
      { id: "seed-a", definition },
      { id: "seed-b", definition },
    ];

    let evaluationCount = 0;
    const evaluation = {
      evaluator: (genome) => {
        evaluationCount += 1;
        // Throw on second generation's evaluation (after first generation completes)
        if (evaluationCount > 2) {
          throw new Error("simulated evaluation failure");
        }
        return {
          fitness: 1,
          descriptors: { axis: 0.5 },
        };
      },
    };

    const config = createBaseConfig({
      runner: { generations: 3, shortlistSize: 0 },
    });

    const result = await runEvolutionRunner({
      baseDir,
      runId: "test-error-handling",
      seed: 42,
      config,
      population,
      evaluation,
    });

    assert.ok(result.haltedReason, `should have haltedReason, got: ${JSON.stringify(result.haltedReason)}`);
    assert.equal(result.haltedReason.cause, "generation-error");
    assert.equal(typeof result.haltedReason.generation, "number");
    assert.equal(typeof result.haltedReason.error, "string", `error should be string, got: ${result.haltedReason.error}`);
    assert.ok(result.generations.length < 3, "should not complete all generations");
  });

  it("logs run-complete message via logger even after error", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runner-log-"));
    const definition = await loadMinimalDefinition();

    const population = [
      { id: "seed-a", definition },
    ];

    const evaluation = {
      evaluator: () => {
        throw new Error("immediate failure");
      },
    };

    const config = createBaseConfig({
      runner: { generations: 1, shortlistSize: 0 },
    });

    const logMessages = [];
    const logger = {
      info: (obj, msg) => logMessages.push({ level: "info", obj, msg }),
      error: (obj, msg) => logMessages.push({ level: "error", obj, msg }),
      warn: () => {},
      debug: () => {},
    };

    const result = await runEvolutionRunner({
      baseDir,
      runId: "test-log-on-error",
      seed: 42,
      config,
      population,
      evaluation,
      logger,
    });

    assert.ok(result.haltedReason);
    const errorLog = logMessages.find((m) => m.level === "error" && m.msg === "generation failed with error");
    assert.ok(errorLog, "should log the generation error");
    const completeLog = logMessages.find((m) => m.level === "info" && m.msg === "evolution run complete");
    assert.ok(completeLog, "should log run completion");
    assert.equal(completeLog.obj.halted, true);
  });
});
