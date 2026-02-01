import { defaultMutationOperators } from "../evolutionary-engine/mutation.js";
import { createSeededRng } from "../simulation-engine/rng.js";
import { writeSeedReport } from "./artifact-writer.js";
import { createRunId } from "./run-layout.js";
import { resolveSeedPopulation } from "./seed-resolver.js";
import { createTelemetry } from "./operator-telemetry.js";
import { clonePopulation } from "./population-utils.js";
import { resolveRate } from "./evolution-rates.js";
import { assertPopulation, isPlainObject } from "./runner-validation.js";
import { createMutationSelector, loadOperatorStats } from "./operator-setup.js";
import {
  resolveSnapshotProvider,
  resolveFeedbackProvider,
} from "./serialization-utils.js";

/**
 * Resolves the initial population, RNG, operator configuration, telemetry,
 * and all other state required before the generation loop begins.
 *
 * @param {object} options  – the top-level runner options
 * @param {object} config   – options.config (already validated)
 * @returns {Promise<object>} initialised runner state
 */
export async function initializeRunner(options, config) {
  const runnerConfig = config.runner;
  const evaluation = options.evaluation;

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

  const motifMiningConfig = isPlainObject(evolutionConfig.motifMining)
    ? evolutionConfig.motifMining
    : { enabled: false };

  const mutationRate = resolveRate(mutationConfig.rate, "evolution.mutation.rate");
  const crossoverRate = resolveRate(crossoverConfig.rate, "evolution.crossover.rate");
  const maxMutationRetries = Number.isInteger(mutationConfig.maxMutationRetries)
    ? mutationConfig.maxMutationRetries
    : undefined;
  const offspringPerParent = Number.isInteger(mutationConfig.offspringPerParent)
    ? mutationConfig.offspringPerParent
    : undefined;

  const mutationOperators = Array.isArray(options.mutationOperators)
    ? [...options.mutationOperators]
    : [...defaultMutationOperators];
  const motifInjectIndex = mutationOperators.findIndex((op) => op.name === "motif-inject");
  const mutationSelector = options.mutationSelector ?? createMutationSelector(mutationOperators);
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
  const feedbackEnabled = config.preferenceLearning?.enabled === true;

  const logger = options.logger ?? null;

  const rejectionRateThreshold = runnerConfig.rejectionRateThreshold ?? 0.8;
  const maxConsecutiveRejections = runnerConfig.maxConsecutiveRejections ?? 3;

  return {
    baseDir,
    runId,
    startGeneration,
    seed,
    rng,
    currentPopulation,
    mutationRate,
    crossoverRate,
    maxMutationRetries,
    offspringPerParent,
    mutationOperators,
    motifInjectIndex,
    mutationSelector,
    telemetry,
    snapshotProvider,
    feedbackProvider,
    feedbackEnabled,
    logger,
    rejectionRateThreshold,
    maxConsecutiveRejections,
    motifMiningConfig,
    evolutionConfig,
    crossoverConfig,
  };
}
