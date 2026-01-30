import { runGenerationLoop } from "../evolutionary-engine/engine.js";
import { defaultMutationOperators } from "../evolutionary-engine/mutation.js";
import { createSeededRng } from "../simulation-engine/rng.js";
import { writeGenerationArtifacts, writeSeedReport } from "./artifact-writer.js";
import { pruneOldGenerations } from "./generation-cleanup.js";
import { createRunId } from "./run-layout.js";
import { resolveSeedPopulation } from "./seed-resolver.js";
import {
  createTelemetry,
  recordOutcome,
  serializeTelemetry,
} from "./operator-telemetry.js";
import { clonePopulation } from "./population-utils.js";
import { resolveRate } from "./evolution-rates.js";
import {
  assertNonEmptyArray,
  assertPopulation,
  isPlainObject,
} from "./runner-validation.js";
import { createMutationSelector, loadOperatorStats } from "./operator-setup.js";
import { buildOperatorOutcomes } from "./operator-outcomes.js";
import {
  serializeMapElites,
  defaultPreferenceModelSnapshot,
  resolveSnapshotProvider,
  resolveFeedbackProvider,
} from "./serialization-utils.js";
import { applyEvolution } from "./evolution-applicator.js";

export async function runEvolutionRunner(options) {
  if (!options || typeof options !== "object") {
    throw new Error("Runner options are required");
  }

  const config = options.config;
  if (!config || typeof config !== "object") {
    throw new Error("Runner config is required");
  }

  const runnerConfig = config.runner;
  if (!runnerConfig || typeof runnerConfig !== "object") {
    throw new Error("Runner loop config is required");
  }

  const generations = runnerConfig.generations;
  if (!Number.isInteger(generations) || generations <= 0) {
    throw new Error("Runner generations must be a positive integer");
  }

  const mapElitesConfig = config.mapElites;
  if (!mapElitesConfig || typeof mapElitesConfig !== "object") {
    throw new Error("Runner requires a MAP-Elites config");
  }

  const evaluation = options.evaluation;
  if (!evaluation || typeof evaluation !== "object") {
    throw new Error("Runner requires evaluation options");
  }

  const baseDir = options.baseDir ?? process.cwd();
  const runId = options.runId ?? createRunId();
  const startGeneration = Number.isInteger(options.startGeneration)
    ? options.startGeneration
    : 0;

  const seed = Number.isFinite(options.seed) ? options.seed : config.seed;

  let currentPopulation;
  if (Array.isArray(options.population) && options.population.length > 0) {
    currentPopulation = clonePopulation(options.population);
  } else if (config.seeding) {
    const rngSeed = Number.isFinite(seed) ? seed : 0;
    const seedResult = await resolveSeedPopulation({
      config,
      rngSeed,
      evaluator: evaluation.evaluator,
    });
    currentPopulation = seedResult.genomes;
    await writeSeedReport({ baseDir, runId, report: seedResult.report });
  } else {
    throw new Error(
      "Runner requires either options.population or config.seeding",
    );
  }
  assertPopulation(currentPopulation);
  const rng = options.rng ?? (Number.isFinite(seed) ? createSeededRng(seed) : null);

  const evolutionConfig = isPlainObject(config.evolution) ? config.evolution : {};
  const mutationConfig = isPlainObject(evolutionConfig.mutation) ? evolutionConfig.mutation : {};
  const crossoverConfig = isPlainObject(evolutionConfig.crossover) ? evolutionConfig.crossover : {};

  const mutationRate = resolveRate(mutationConfig.rate, "evolution.mutation.rate");
  const crossoverRate = resolveRate(crossoverConfig.rate, "evolution.crossover.rate");

  const mutationOperators = Array.isArray(options.mutationOperators)
    ? options.mutationOperators
    : defaultMutationOperators;
  const mutationSelector = createMutationSelector(mutationOperators);
  const operatorNames = mutationOperators.map((operator) => operator.name);
  const telemetry =
    (await loadOperatorStats({
      baseDir,
      runId,
      startGeneration,
      operatorNames,
    })) ?? createTelemetry(operatorNames);

  const snapshotProvider = resolveSnapshotProvider(options.preferenceModelSnapshots);
  const feedbackProvider = resolveFeedbackProvider(options.feedback);
  const feedbackEnabled = config.humanFeedback?.enabled === true;

  const results = [];
  let pendingOperatorNames = null;

  for (let offset = 0; offset < generations; offset += 1) {
    const generation = startGeneration + offset;

    const loopResult = runGenerationLoop({
      population: currentPopulation,
      evaluation,
      mapElites: mapElitesConfig,
      rng: rng ?? undefined,
      shortlistSize: runnerConfig.shortlistSize,
    });

    if (pendingOperatorNames) {
      const outcomes = buildOperatorOutcomes(loopResult);
      currentPopulation.forEach((genome, index) => {
        const operatorName = pendingOperatorNames[index];
        if (!operatorName) {
          return;
        }
        const outcome = outcomes.get(genome);
        if (outcome) {
          recordOutcome(telemetry, operatorName, outcome);
        }
      });
    }

    const evolutionResult = applyEvolution(loopResult.nextGeneration, {
      rng: rng ?? undefined,
      mutationRate,
      crossoverRate,
      mutationOperators,
      crossoverOperators: options.crossoverOperators,
      repairOperators: options.repairOperators,
      mutationSelector,
      telemetry,
    });

    const evolvedPopulation = evolutionResult.population;
    pendingOperatorNames = evolutionResult.operatorNames;

    assertPopulation(evolvedPopulation);

    let determinism = options.determinism;
    if (!determinism && rng) {
      determinism = {};
      if (Number.isFinite(seed)) {
        determinism.seed = seed;
      }
      if (Object.keys(determinism).length === 0) {
        determinism = undefined;
      }
    }

    const generationContext = {
      generation,
      runId,
      baseDir,
      loopResult,
      population: evolvedPopulation,
    };

    const feedback =
      feedbackEnabled && feedbackProvider ? await feedbackProvider(generationContext) : undefined;
    const preferenceModelSnapshots = snapshotProvider
      ? snapshotProvider(generationContext)
      : [defaultPreferenceModelSnapshot({ runId, generation, seed })];
    assertNonEmptyArray(preferenceModelSnapshots, "Preference model snapshots");

    const artifacts = await writeGenerationArtifacts({
      baseDir,
      runId,
      generation,
      population: evolvedPopulation.map((genome) => ({
        id: genome.id,
        definition: genome.definition,
      })),
      evaluated: loopResult.evaluated,
      rejected: loopResult.rejected,
      mapElites: serializeMapElites(loopResult.mapElites),
      shortlist: loopResult.shortlist,
      feedback,
      preferenceModelSnapshots,
      determinism,
      operatorStats: serializeTelemetry(telemetry),
    });

    if (runnerConfig.maxRetainedGenerations != null) {
      await pruneOldGenerations({
        baseDir,
        runId,
        maxRetained: runnerConfig.maxRetainedGenerations,
      });
    }

    results.push({
      generation,
      population: evolvedPopulation,
      evaluated: loopResult.evaluated,
      rejected: loopResult.rejected,
      mapElites: loopResult.mapElites,
      shortlist: loopResult.shortlist,
      artifacts,
    });

    currentPopulation = evolvedPopulation;
  }

  return {
    runId,
    baseDir,
    generations: results,
  };
}
