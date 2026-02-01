import { checkHighRejectionHalt } from "./termination-checks.js";
import { validateRunnerOptions } from "./runner-options-validator.js";
import { initializeRunner } from "./runner-initializer.js";
import { executeGenerationBody } from "./generation-body.js";
import { createInitialControllerState } from "./preference-controller.js";

function withTimeout(promise, ms, label) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ __timedOut: true, label });
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function runEvolutionRunner(options) {
  validateRunnerOptions(options);

  const config = options.config;
  const runnerConfig = config.runner;
  const generations = runnerConfig.generations;
  const mapElitesConfig = config.mapElites;
  const evaluation = options.evaluation;

  const {
    baseDir,
    runId,
    startGeneration,
    seed,
    rng,
    currentPopulation: initialPopulation,
    mutationRate,
    crossoverRate,
    maxMutationRetries,
    offspringPerParent,
    mutationOperators: initialMutationOperators,
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
  } = await initializeRunner(options, config);

  let currentPopulation = initialPopulation;
  let consecutiveHighRejections = 0;
  let mutationOperators = initialMutationOperators;
  let controllerState = createInitialControllerState();

  const results = [];
  let pendingOperatorNames = null;
  let haltedReason = null;

  for (let offset = 0; offset < generations; offset += 1) {
    const generation = startGeneration + offset;

    try {
      const generationTimeoutMs = runnerConfig.generationTimeoutMs ?? 300_000;

      const genResult = await withTimeout(
        executeGenerationBody({
          generation,
          currentPopulation,
          evaluation,
          mapElitesConfig,
          rng,
          runnerConfig,
          config,
          options,
          pendingOperatorNames,
          mutationOperators,
          motifInjectIndex,
          motifMiningConfig,
          telemetry,
          mutationSelector,
          mutationRate,
          crossoverRate,
          maxMutationRetries,
          offspringPerParent,
          snapshotProvider,
          feedbackProvider,
          feedbackEnabled,
          controllerState,
          runId,
          baseDir,
          seed,
          logger,
          withTimeout,
        }),
        generationTimeoutMs,
        "generation",
      );

      if (genResult && genResult.__timedOut) {
        throw new Error(`Generation ${generation} timed out after ${generationTimeoutMs}ms`);
      }

      if (genResult.__halt) {
        haltedReason = genResult.haltedReason;
        break;
      }

      const { loopResult, evolvedPopulation, artifacts } = genResult;
      pendingOperatorNames = genResult.pendingOperatorNames;
      mutationOperators = genResult.mutationOperators;
      controllerState = genResult.nextControllerState ?? controllerState;

      results.push({
        generation,
        population: evolvedPopulation,
        evaluated: loopResult.evaluated,
        rejected: loopResult.rejected,
        mapElites: loopResult.mapElites,
        shortlist: loopResult.shortlist,
        artifacts,
      });

      const totalEvaluated = loopResult.evaluated.length + loopResult.rejected.length;
      const rejectionRate = totalEvaluated > 0
        ? loopResult.rejected.length / totalEvaluated
        : 0;

      if (logger) {
        logger.info(
          {
            generation,
            evaluated: loopResult.evaluated.length,
            rejected: loopResult.rejected.length,
            rejectionRate,
            populationSize: evolvedPopulation.length,
          },
          "generation end",
        );
        logger.flush?.();
      }

      const haltCheck = checkHighRejectionHalt({
        rejectionRate,
        rejectionRateThreshold,
        consecutiveHighRejections,
        maxConsecutiveRejections,
        generation,
        rejected: loopResult.rejected,
        logger,
      });
      consecutiveHighRejections = haltCheck.consecutiveHighRejections;
      if (haltCheck.haltedReason) {
        haltedReason = haltCheck.haltedReason;
        break;
      }

      currentPopulation = evolvedPopulation;
    } catch (error) {
      if (logger) {
        logger.error(
          { generation, error: error instanceof Error ? error.message : String(error) },
          "generation failed with error",
        );
      }
      haltedReason = {
        cause: "generation-error",
        generation,
        error: error instanceof Error ? error.message : String(error),
      };
      break;
    }
  }

  if (logger) {
    logger.info(
      { runId, generationsCompleted: results.length, halted: !!haltedReason },
      "evolution run complete",
    );
  }

  return {
    runId,
    baseDir,
    generations: results,
    ...(haltedReason ? { haltedReason } : {}),
  };
}
