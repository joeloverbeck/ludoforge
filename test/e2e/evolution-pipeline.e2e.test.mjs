import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runGenerationLoop } from "../../src/evolutionary-engine/engine.js";
import { createMockHumanEval } from "./helpers/mock-human-eval.js";
import { createMockSimulation } from "./helpers/mock-simulation.js";
import { createMockFitness } from "./helpers/mock-fitness.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

test("evolution pipeline happy path runs seed -> simulate -> eval -> fitness -> evolve -> re-simulate", async () => {
  const definitions = await Promise.all([
    loadFixture("evo-seed-1.json"),
    loadFixture("evo-seed-2.json"),
  ]);

  const population = definitions.map((definition, index) => ({
    id: `seed-${index + 1}`,
    definition,
  }));

  const descriptorById = new Map([
    ["seed-1", { length: 0, randomness: 0 }],
    ["seed-2", { length: 2, randomness: 0 }],
  ]);

  const timeline = [];
  const seenPhases = new Set();
  const perCandidateSteps = new Map();
  const evaluationArtifacts = new Map();

  function recordPhase(phase) {
    if (!seenPhases.has(phase)) {
      timeline.push(phase);
      seenPhases.add(phase);
    }
  }

  function recordCandidateStep(id, step) {
    if (!perCandidateSteps.has(id)) {
      perCandidateSteps.set(id, []);
    }
    perCandidateSteps.get(id).push(step);
  }

  recordPhase("seed");

  const simulation = createMockSimulation({ seed: 17, maxTurns: 4, terminalTurns: 2 });
  const humanEval = createMockHumanEval({ seed: 23 });
  const fitnessHelper = createMockFitness();

  const evaluation = {
    evaluator: (genome) => {
      assert.ok(genome.id, "Expected genome to include a stable id.");
      recordPhase("simulate");
      recordCandidateStep(genome.id, "simulate");
      const simulationResult = simulation.run({
        definition: genome.definition,
        mode: "terminal",
      });

      recordPhase("mock-eval");
      recordCandidateStep(genome.id, "mock-eval");
      const metrics = [
        { id: "novelty", value: simulationResult.trajectory.steps.length },
        { id: "variety", value: genome.id === "seed-1" ? 0.2 : 0.4 },
      ];
      const featureVector = fitnessHelper.buildFeatureVector({
        metrics,
        degeneracy: { flags: [] },
      });
      const evaluationResult = humanEval.rateCandidate({
        id: genome.id,
        featureVector,
      });
      assert.equal(evaluationResult.candidateId, genome.id);

      recordPhase("fitness");
      recordCandidateStep(genome.id, "fitness");
      const descriptors = descriptorById.get(genome.id);
      assert.ok(descriptors, `Missing descriptors for ${genome.id}`);
      const fitness = fitnessHelper.evaluate({
        metrics,
        degeneracy: { flags: [] },
        descriptors,
      });

      evaluationArtifacts.set(genome.id, {
        simulationResult,
        evaluationResult,
        fitness,
      });

      return {
        fitness: fitness.fitness,
        descriptors: fitness.descriptors,
        diagnostics: {
          simulation: simulationResult,
          evaluation: evaluationResult,
        },
      };
    },
  };

  const result = runGenerationLoop({
    population,
    evaluation,
    mapElites: {
      descriptors: [
        { id: "length", min: 0, max: 2, bins: 2 },
        { id: "randomness", min: 0, max: 1, bins: 1 },
      ],
    },
    shortlistSize: 0,
  });

  recordPhase("evolve");

  const nextGeneration = result.nextGeneration;
  const resimulated = nextGeneration.map((genome) =>
    simulation.run({ definition: genome.definition, mode: "terminal" })
  );
  recordPhase("re-simulate");

  assert.deepEqual(timeline, [
    "seed",
    "simulate",
    "mock-eval",
    "fitness",
    "evolve",
    "re-simulate",
  ]);

  for (const [id, steps] of perCandidateSteps.entries()) {
    assert.deepEqual(steps, ["simulate", "mock-eval", "fitness"]);
    assert.ok(evaluationArtifacts.has(id));
  }

  assert.equal(result.rejected.length, 0);
  assert.equal(result.evaluated.length, population.length);
  assert.equal(nextGeneration.length, population.length);
  assert.equal(resimulated.length, nextGeneration.length);

  const originalIds = new Set(population.map((genome) => genome.id));
  const evaluatedIds = result.evaluated.map((entry) => entry.genome.id);
  const nextIds = nextGeneration.map((genome) => genome.id);

  evaluatedIds.forEach((id) => assert.ok(originalIds.has(id)));
  nextIds.forEach((id) => assert.ok(originalIds.has(id)));
});

test("evolution pipeline rejects invalid seeds before evaluation runs", async () => {
  const validDefinition = await loadFixture("evo-seed-1.json");
  const invalidDefinition = JSON.parse(JSON.stringify(validDefinition));
  invalidDefinition.termination.conditions = [];
  delete invalidDefinition.termination.maxTurns;

  const population = [
    {
      id: "invalid-seed",
      definition: invalidDefinition,
    },
  ];

  let evaluatorCalls = 0;
  const evaluation = {
    evaluator: () => {
      evaluatorCalls += 1;
      return {
        fitness: 1,
        descriptors: { length: 0, randomness: 0 },
      };
    },
  };

  const result = runGenerationLoop({
    population,
    evaluation,
    mapElites: {
      descriptors: [
        { id: "length", min: 0, max: 2, bins: 2 },
        { id: "randomness", min: 0, max: 1, bins: 1 },
      ],
    },
  });

  assert.equal(evaluatorCalls, 0);
  assert.equal(result.evaluated.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].genome.id, "invalid-seed");
  assert.equal(result.rejected[0].diagnostics.validation.valid, false);
});

test("evolution pipeline records safety cutoffs for non-terminating fixtures", async () => {
  const definition = await loadFixture("evo-non-terminating.json");
  const population = [{ id: "seed-cutoff", definition }];

  const simulation = createMockSimulation({ seed: 9, maxTurns: 3 });
  const humanEval = createMockHumanEval({ seed: 11 });
  const fitnessHelper = createMockFitness();

  const evaluation = {
    evaluator: (genome) => {
      const simulationResult = simulation.run({ definition: genome.definition, mode: "cutoff" });
      const featureVector = fitnessHelper.buildFeatureVector({
        metrics: [{ id: "steps", value: simulationResult.trajectory.steps.length }],
        degeneracy: { flags: [] },
      });
      const evaluationResult = humanEval.rateCandidate({
        id: genome.id,
        featureVector,
      });

      const fitness = fitnessHelper.evaluate({
        metrics: [{ id: "steps", value: simulationResult.trajectory.steps.length }],
        degeneracy: { flags: [] },
        descriptors: { length: 1, randomness: 0 },
      });

      return {
        fitness: fitness.fitness,
        descriptors: fitness.descriptors,
        diagnostics: {
          simulation: simulationResult,
          evaluation: evaluationResult,
        },
      };
    },
  };

  const result = runGenerationLoop({
    population,
    evaluation,
    mapElites: {
      descriptors: [
        { id: "length", min: 0, max: 2, bins: 2 },
        { id: "randomness", min: 0, max: 1, bins: 1 },
      ],
    },
  });

  assert.equal(result.evaluated.length, 1);
  const evaluationDiagnostics = result.evaluated[0].diagnostics.evaluation;
  assert.equal(evaluationDiagnostics.simulation.terminationReason, "max-turns");
  assert.equal(evaluationDiagnostics.simulation.terminated, false);
  assert.ok(!("reason" in evaluationDiagnostics.simulation.outcome));
  assert.equal(evaluationDiagnostics.evaluation.candidateId, "seed-cutoff");
});

test("evolution pipeline outcomes are deterministic for identical seeds", async () => {
  const definitions = await Promise.all([
    loadFixture("evo-seed-1.json"),
    loadFixture("evo-seed-2.json"),
  ]);

  const population = definitions.map((definition, index) => ({
    id: `seed-${index + 1}`,
    definition,
  }));

  function runOnce() {
    const simulation = createMockSimulation({ seed: 17, maxTurns: 4, terminalTurns: 2 });
    const humanEval = createMockHumanEval({ seed: 23 });
    const fitnessHelper = createMockFitness();

    const evaluation = {
      evaluator: (genome) => {
        const simulationResult = simulation.run({
          definition: genome.definition,
          mode: "terminal",
        });
        const metrics = [
          { id: "novelty", value: simulationResult.trajectory.steps.length },
          { id: "variety", value: genome.id === "seed-1" ? 0.2 : 0.4 },
        ];
        const featureVector = fitnessHelper.buildFeatureVector({
          metrics,
          degeneracy: { flags: [] },
        });
        const evaluationResult = humanEval.rateCandidate({
          id: genome.id,
          featureVector,
        });
        const fitness = fitnessHelper.evaluate({
          metrics,
          degeneracy: { flags: [] },
          descriptors: { length: genome.id === "seed-1" ? 0 : 2, randomness: 0 },
        });

        return {
          fitness: fitness.fitness,
          descriptors: fitness.descriptors,
          diagnostics: {
            simulation: simulationResult,
            evaluation: evaluationResult,
          },
        };
      },
    };

    const result = runGenerationLoop({
      population,
      evaluation,
      mapElites: {
        descriptors: [
          { id: "length", min: 0, max: 2, bins: 2 },
          { id: "randomness", min: 0, max: 1, bins: 1 },
        ],
      },
      shortlistSize: 0,
    });

    return {
      evaluated: result.evaluated.map((entry) => ({
        id: entry.genome.id,
        fitness: entry.fitness,
        descriptors: entry.descriptors,
      })),
      nextIds: result.nextGeneration.map((genome) => genome.id),
    };
  }

  const first = runOnce();
  const second = runOnce();

  assert.deepEqual(first, second);
});
