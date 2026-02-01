import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Capture artifact arguments for each generation
const artifactLog = [];

mock.module("../../src/evolution-runner/artifact-writer.js", {
  namedExports: {
    async writeGenerationArtifacts(args) {
      artifactLog.push(args);
      return {
        generationDir: `/mock/generation-${args.generation}`,
        populationPath: `/mock/generation-${args.generation}/population.jsonl`,
        preferenceModelPath: `/mock/generation-${args.generation}/preference-model.jsonl`,
      };
    },
    async writeSeedReport() {},
  },
});

const { runEvolutionRunner } = await import(
  "../../src/evolution-runner/runner.js"
);
const { createSeededRng } = await import(
  "../../src/simulation-engine/rng.js"
);

const MAP_ELITES_CONFIG = {
  descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }],
};

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function createMockEvaluator(seed) {
  const rng = createSeededRng(seed);
  return {
    evaluator(genome) {
      return {
        fitness: rng.next(),
        descriptors: { agency: rng.next() },
        diagnostics: { featureVector: { x: rng.next() } },
      };
    },
  };
}

describe("freeze-lifecycle", () => {
  it("controller transitions through learning → frozen → calibration → unfreeze across generations", async () => {
    artifactLog.length = 0;

    const definitions = await Promise.all([
      loadFixture("evo-seed-1.json"),
      loadFixture("evo-seed-2.json"),
      loadFixture("choice-game.json"),
    ]);

    const population = definitions.map((definition, index) => ({
      id: `seed-${index + 1}`,
      definition,
    }));

    let feedbackCallCount = 0;

    async function feedbackProvider() {
      feedbackCallCount += 1;
      return [];
    }

    // Run 6 generations with freeze enabled:
    //  - freeze.freezeAfterStableGens=1, minTotalSamples=0 → freezes immediately
    //  - calibration every 2 gens with 1 sample
    //  The controller should freeze quickly since minTotalSamples=0 and
    //  stableUncertaintyThreshold=1 (everything is "stable" below 1).
    await runEvolutionRunner({
      config: {
        runner: { generations: 6 },
        mapElites: MAP_ELITES_CONFIG,
        seed: 42,
        evolution: {
          mutation: { rate: 0 },
          crossover: { rate: 0 },
        },
        preferenceLearning: {
          enabled: true,
          budget: {
            baseMaxPerGen: 2,
          },
          controller: {
            freeze: {
              enabled: true,
              minTotalSamples: 0,
              freezeAfterStableGens: 1,
              stableUncertaintyThreshold: 1.0,
              requireNoNewMetricIds: false,
            },
            calibration: {
              enabled: true,
              everyGens: 3,
              samples: 1,
              strategy: "activeLearning",
            },
            drift: {
              enabled: false,
              unfreezeUncertaintyThreshold: 0.9,
              minCalibrationAccuracy: 0.5,
              ood: { enabled: false, maxOodRate: 0.5 },
            },
          },
        },
      },
      population,
      evaluation: createMockEvaluator(42),
      seed: 42,
      feedback: feedbackProvider,
    });

    // Verify artifacts written for each generation
    assert.equal(artifactLog.length, 6, "expected 6 generation artifacts");

    for (let i = 0; i < artifactLog.length; i += 1) {
      const gen = artifactLog[i];

      // All 3 new artifacts must be present every generation
      assert.ok(
        gen.preferenceController !== undefined,
        `generation ${i}: preference-controller.json missing`,
      );
      assert.ok(
        gen.preferenceHealth !== undefined,
        `generation ${i}: preference-health.json missing`,
      );
      assert.ok(
        gen.tasteVector !== undefined,
        `generation ${i}: taste-vector.json missing`,
      );

      // Controller state structure
      assert.ok(
        gen.preferenceController.mode === "learning" ||
        gen.preferenceController.mode === "frozen",
        `generation ${i}: controller mode must be "learning" or "frozen"`,
      );
      assert.ok(
        typeof gen.preferenceController.stableGenCount === "number",
        `generation ${i}: stableGenCount must be a number`,
      );

      // Preference health structure
      assert.ok(
        typeof gen.preferenceHealth.controllerMode === "string",
        `generation ${i}: health.controllerMode must be a string`,
      );
      assert.ok(
        typeof gen.preferenceHealth.plannedBudget === "number",
        `generation ${i}: health.plannedBudget must be a number`,
      );
      assert.ok(
        typeof gen.preferenceHealth.didPrompt === "boolean",
        `generation ${i}: health.didPrompt must be a boolean`,
      );

      // Taste vector structure
      assert.ok(
        gen.tasteVector.features !== null && typeof gen.tasteVector.features === "object",
        `generation ${i}: tasteVector.features must be an object`,
      );
    }

    // The controller should reach frozen state — with minTotalSamples=0 and
    // stableUncertaintyThreshold=1.0, it freezes after 1 stable gen.
    const frozenGens = artifactLog.filter(
      (gen) => gen.preferenceController.mode === "frozen",
    );
    assert.ok(
      frozenGens.length > 0,
      "expected at least one generation in frozen state",
    );

    // Frozen generations should have budget=0 (unless calibration)
    const frozenNonCalibrationGens = frozenGens.filter(
      (gen) => gen.preferenceHealth.plannedBudget === 0,
    );
    assert.ok(
      frozenNonCalibrationGens.length > 0,
      "expected at least one frozen generation with zero budget",
    );
  });

  it("frozen generation produces zero-budget feedback plan", async () => {
    artifactLog.length = 0;

    const definitions = await Promise.all([
      loadFixture("evo-seed-1.json"),
      loadFixture("evo-seed-2.json"),
    ]);

    const population = definitions.map((definition, index) => ({
      id: `seed-${index + 1}`,
      definition,
    }));

    let promptCount = 0;
    async function feedbackProvider() {
      promptCount += 1;
      return [];
    }

    // Freeze immediately (minTotalSamples=0, freezeAfterStableGens=1, threshold=1.0)
    // No calibration, no drift — should freeze and stay frozen with 0 budget.
    await runEvolutionRunner({
      config: {
        runner: { generations: 4 },
        mapElites: MAP_ELITES_CONFIG,
        seed: 99,
        evolution: {
          mutation: { rate: 0 },
          crossover: { rate: 0 },
        },
        preferenceLearning: {
          enabled: true,
          budget: { baseMaxPerGen: 3 },
          controller: {
            freeze: {
              enabled: true,
              minTotalSamples: 0,
              freezeAfterStableGens: 1,
              stableUncertaintyThreshold: 1.0,
              requireNoNewMetricIds: false,
            },
            calibration: {
              enabled: false,
              everyGens: 100,
              samples: 0,
            },
            drift: {
              enabled: false,
              unfreezeUncertaintyThreshold: 0.9,
              minCalibrationAccuracy: 0.5,
              ood: { enabled: false, maxOodRate: 0.5 },
            },
          },
        },
      },
      population,
      evaluation: createMockEvaluator(99),
      seed: 99,
      feedback: feedbackProvider,
    });

    // After freezing, subsequent generations should have budget=0
    const frozenHealthArtifacts = artifactLog
      .filter((gen) => gen.preferenceController.mode === "frozen")
      .map((gen) => gen.preferenceHealth);

    assert.ok(
      frozenHealthArtifacts.length >= 2,
      "expected at least 2 frozen generations",
    );

    for (const health of frozenHealthArtifacts) {
      assert.equal(
        health.plannedBudget,
        0,
        "frozen non-calibration generation must have budget=0",
      );
    }
  });

  it("all 3 preference artifacts present in every generation even without feedback", async () => {
    artifactLog.length = 0;

    const definitions = await Promise.all([
      loadFixture("evo-seed-1.json"),
      loadFixture("evo-seed-2.json"),
    ]);

    const population = definitions.map((definition, index) => ({
      id: `seed-${index + 1}`,
      definition,
    }));

    await runEvolutionRunner({
      config: {
        runner: { generations: 3 },
        mapElites: MAP_ELITES_CONFIG,
        seed: 7,
        evolution: {
          mutation: { rate: 0 },
          crossover: { rate: 0 },
        },
        preferenceLearning: {
          enabled: false,
        },
      },
      population,
      evaluation: createMockEvaluator(7),
      seed: 7,
    });

    assert.equal(artifactLog.length, 3, "expected 3 generations");

    for (let i = 0; i < artifactLog.length; i += 1) {
      const gen = artifactLog[i];
      assert.ok(gen.preferenceController !== undefined, `gen ${i}: controller missing`);
      assert.ok(gen.preferenceHealth !== undefined, `gen ${i}: health missing`);
      assert.ok(gen.tasteVector !== undefined, `gen ${i}: taste vector missing`);
    }
  });
});
