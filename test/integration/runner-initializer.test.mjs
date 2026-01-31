import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeRunner } from "../../src/evolution-runner/runner-initializer.js";
import { genomeBasicDefinition } from "./fixtures/index.mjs";

function makePopulation() {
  return [
    { id: "g-1", definition: structuredClone(genomeBasicDefinition) },
    { id: "g-2", definition: structuredClone(genomeBasicDefinition) },
  ];
}

function makeConfig(overrides = {}) {
  return {
    runner: { generations: 1, shortlistSize: 0 },
    mapElites: { descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }] },
    ...overrides,
  };
}

function makeEvaluation() {
  return {
    evaluator: () => ({ fitness: 1, descriptors: { axis: 0 } }),
  };
}

describe("runner-initializer integration", () => {
  it("initialises with a provided population and clones it", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const pop = makePopulation();
    const config = makeConfig();
    const options = { config, evaluation: makeEvaluation(), population: pop, baseDir };

    const state = await initializeRunner(options, config);

    assert.equal(state.currentPopulation.length, 2);
    assert.notEqual(state.currentPopulation, pop, "population should be cloned");
    assert.notEqual(state.currentPopulation[0], pop[0]);
  });

  it("returns all expected state fields", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig();
    const options = { config, evaluation: makeEvaluation(), population: makePopulation(), baseDir };

    const state = await initializeRunner(options, config);

    const requiredKeys = [
      "baseDir", "runId", "startGeneration", "seed", "rng",
      "currentPopulation", "mutationRate", "crossoverRate",
      "maxMutationRetries", "offspringPerParent",
      "mutationOperators", "motifInjectIndex", "mutationSelector",
      "telemetry", "snapshotProvider", "feedbackProvider",
      "feedbackEnabled", "logger", "rejectionRateThreshold",
      "maxConsecutiveRejections", "motifMiningConfig",
      "evolutionConfig", "crossoverConfig",
    ];
    for (const key of requiredKeys) {
      assert.ok(key in state, `missing key: ${key}`);
    }
  });

  it("creates seeded RNG when seed is provided", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig();
    const options = {
      config,
      evaluation: makeEvaluation(),
      population: makePopulation(),
      baseDir,
      seed: 42,
    };

    const state = await initializeRunner(options, config);

    assert.ok(state.rng !== null, "rng should be created from seed");
    assert.ok(typeof state.rng === "function" || typeof state.rng === "object", "rng should be created");
  });

  it("uses provided mutationSelector over default", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig();
    const customSelector = { select: () => 0, observe: () => {} };
    const options = {
      config,
      evaluation: makeEvaluation(),
      population: makePopulation(),
      baseDir,
      mutationSelector: customSelector,
    };

    const state = await initializeRunner(options, config);

    assert.equal(state.mutationSelector, customSelector);
  });

  it("sets feedbackEnabled from humanFeedback config", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig({ humanFeedback: { enabled: true } });
    const options = { config, evaluation: makeEvaluation(), population: makePopulation(), baseDir };

    const state = await initializeRunner(options, config);

    assert.equal(state.feedbackEnabled, true);
  });

  it("defaults feedbackEnabled to false when humanFeedback is absent", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig();
    const options = { config, evaluation: makeEvaluation(), population: makePopulation(), baseDir };

    const state = await initializeRunner(options, config);

    assert.equal(state.feedbackEnabled, false);
  });

  it("throws when neither population nor seeding is provided", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "init-test-"));
    const config = makeConfig();
    const options = { config, evaluation: makeEvaluation(), baseDir };

    await assert.rejects(
      () => initializeRunner(options, config),
      /options\.population or config\.seeding/,
    );
  });
});
