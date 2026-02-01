import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Must mock writeGenerationArtifacts BEFORE importing runner
mock.module("../../src/evolution-runner/artifact-writer.js", {
  namedExports: {
    async writeGenerationArtifacts({ generation }) {
      return {
        generationDir: `/mock/generation-${generation}`,
        populationPath: `/mock/generation-${generation}/population.jsonl`,
        preferenceModelPath: `/mock/generation-${generation}/preference-model.jsonl`,
      };
    },
    async writeSeedReport() {},
  },
});

const { runEvolutionRunner } = await import(
  "../../src/evolution-runner/runner.js"
);
const { computeAdaptiveBudget } = await import(
  "../../src/evolution-runner/adaptive-budget.js"
);
const { selectActiveLearningPairs } = await import(
  "../../src/evaluation-analytics/active-learning.js"
);
const { createSeededRng } = await import(
  "../../src/simulation-engine/rng.js"
);

const MAP_ELITES_CONFIG = {
  descriptors: [{ id: "agency", min: 0, max: 1, bins: 2 }],
};

const FEATURE_VECTORS = new Map([
  ["seed-1", { x: 1 }],
  ["seed-2", { x: 1.5 }],
  ["seed-3", { x: 2 }],
]);

const DESCRIPTOR_VALUES = new Map([
  ["seed-1", 0.1],
  ["seed-2", 0.2],
  ["seed-3", 0.9],
]);

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function createMockEvaluator(seed) {
  const rng = createSeededRng(seed);
  return {
    evaluator(genome) {
      const descriptor = DESCRIPTOR_VALUES.get(genome.id) ?? rng.next();
      const featureVector = FEATURE_VECTORS.get(genome.id) ?? { x: rng.next() };
      return {
        fitness: rng.next(),
        descriptors: { agency: descriptor },
        diagnostics: { featureVector },
      };
    },
  };
}

function buildCandidates(loopResult) {
  const nicheByGenome = new Map();
  for (const placement of loopResult?.mapElites?.placements ?? []) {
    const genomeId = placement?.member?.genome?.id;
    if (genomeId) {
      nicheByGenome.set(genomeId, placement.nicheId ?? null);
    }
  }

  return (loopResult?.evaluated ?? [])
    .map((entry) => {
      const genomeId = entry?.genome?.id;
      return {
        id: genomeId,
        featureVector: FEATURE_VECTORS.get(genomeId) ?? null,
        nicheId: nicheByGenome.get(genomeId) ?? null,
      };
    })
    .filter((candidate) => candidate.id && candidate.featureVector);
}

function collectMetricIds(candidates) {
  const metricIds = new Set();
  for (const candidate of candidates ?? []) {
    const featureVector = candidate?.featureVector;
    if (!featureVector || typeof featureVector !== "object") {
      continue;
    }
    for (const key of Object.keys(featureVector)) {
      metricIds.add(key);
    }
  }
  return Array.from(metricIds).sort();
}

describe("adaptive-human-budget", () => {
  it("adjusts sampling and preserves diversity quota across generations", async () => {
    const definitions = await Promise.all([
      loadFixture("evo-seed-1.json"),
      loadFixture("evo-seed-2.json"),
      loadFixture("choice-game.json"),
    ]);

    const population = definitions.map((definition, index) => ({
      id: `seed-${index + 1}`,
      definition,
    }));

    const highUncertaintyState = {
      models: [
        { weights: { x: 5 }, bias: 0 },
        { weights: { x: -5 }, bias: 0 },
      ],
    };
    const lowUncertaintyState = {
      models: [
        { weights: { x: 1 }, bias: 0 },
        { weights: { x: 1 }, bias: 0 },
      ],
    };

    const observedBudgets = new Map();
    const observedPairs = new Map();
    let previousMetricIds = null;

    async function feedbackProvider({ generation, loopResult }) {
      const candidates = buildCandidates(loopResult);
      const metricIds = collectMetricIds(candidates);
      const preferenceModelState = generation === 0
        ? highUncertaintyState
        : lowUncertaintyState;

      const { budget: maxSamplesPerGen } = computeAdaptiveBudget({
        preferenceModelState,
        baseMaxSamples: 4,
        metricIds,
        previousMetricIds,
        candidates,
        lowUncertaintyThreshold: 0.2,
        highUncertaintyThreshold: 0.6,
        enabled: true,
      });

      const pairs = selectActiveLearningPairs(candidates, preferenceModelState, {
        maxPairs: maxSamplesPerGen,
        uncertaintyThreshold: 0,
        diversityQuota: 1,
        iteration: generation,
      });

      observedBudgets.set(generation, maxSamplesPerGen);
      observedPairs.set(generation, pairs);

      if (metricIds.length > 0) {
        previousMetricIds = metricIds;
      }

      return [];
    }

    await runEvolutionRunner({
      config: {
        runner: { generations: 2 },
        mapElites: MAP_ELITES_CONFIG,
        seed: 17,
        evolution: {
          mutation: { rate: 0 },
          crossover: { rate: 0 },
        },
        preferenceLearning: {
          enabled: true,
        },
      },
      population,
      evaluation: createMockEvaluator(17),
      seed: 17,
      feedback: feedbackProvider,
    });

    assert.equal(
      observedBudgets.get(0),
      6,
      "expected high uncertainty to increase sampling budget"
    );
    assert.equal(
      observedBudgets.get(1),
      2,
      "expected low uncertainty to reduce sampling budget"
    );

    const gen0Pairs = observedPairs.get(0) ?? [];
    const hasUnderrepresented = gen0Pairs.some(
      (pair) => pair.candidateA.nicheId === "agency:1" || pair.candidateB.nicheId === "agency:1"
    );
    assert.ok(hasUnderrepresented, "expected diversity quota to include underrepresented niche");
  });
});
