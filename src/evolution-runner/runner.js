import { runGenerationLoop } from "../evolutionary-engine/engine.js";
import { writeGenerationArtifacts } from "./artifact-writer.js";
import { pruneOldGenerations } from "./generation-cleanup.js";
import {
  serializeTelemetry,
} from "./operator-telemetry.js";
import {
  assertPopulation,
} from "./runner-validation.js";
import {
  serializeMapElites,
} from "./serialization-utils.js";
import { recordGenerationTelemetry } from "./operator-telemetry-recorder.js";
import { applyEvolution } from "./evolution-applicator.js";
import { replenishPopulation } from "./population-replenisher.js";
import { assembleDeterminism } from "./determinism-assembly.js";
import { checkPopulationExtinction, checkHighRejectionHalt } from "./termination-checks.js";
import { buildGenerationContext } from "./generation-context.js";
import { runMotifMiningPipeline } from "./motif-pipeline.js";
import { createMotifInjectMutation } from "../evolutionary-engine/mutation/operators/motif-inject.js";
import { resolveRunDir, resolveRunPath } from "./run-layout.js";
import { validateRunnerOptions } from "./runner-options-validator.js";
import { initializeRunner } from "./runner-initializer.js";

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
  } = await initializeRunner(options, config);

  let currentPopulation = initialPopulation;
  let consecutiveHighRejections = 0;

  const results = [];
  let pendingOperatorNames = null;
  let haltedReason = null;

  for (let offset = 0; offset < generations; offset += 1) {
    const generation = startGeneration + offset;

    try {
      const generationTimeoutMs = runnerConfig.generationTimeoutMs ?? 300_000;

      const generationBody = async () => {
      if (logger) {
        logger.info(
          { generation, totalGenerations: generations, populationSize: currentPopulation.length },
          "generation start",
        );
      }

      const loopResult = await runGenerationLoop({
        population: currentPopulation,
        evaluation,
        mapElites: mapElitesConfig,
        rng: rng ?? undefined,
        shortlistSize: runnerConfig.shortlistSize,
        logger: logger ?? undefined,
      });

      recordGenerationTelemetry({
        pendingOperatorNames,
        loopResult,
        currentPopulation,
        telemetry,
        mutationSelector,
      });

      const extinctionResult = await checkPopulationExtinction({
        generation,
        loopResult,
        currentPopulation,
        telemetry,
        snapshotProvider,
        runId,
        baseDir,
        seed,
        logger,
      });
      if (extinctionResult) {
        return { __halt: true, haltedReason: extinctionResult.haltedReason };
      }

      const genDir = resolveRunPath(resolveRunDir(baseDir, runId), `generation-${generation}`);
      const motifTimeoutMs = motifMiningConfig.timeoutMs ?? 120_000;
      const rawMiningResult = await withTimeout(
        runMotifMiningPipeline({
          mapElitesResult: loopResult.mapElites,
          motifMiningConfig,
          simulationConfig: evaluation.simulationConfig ?? {},
          generationDir: genDir,
          seed: motifMiningConfig.seed ?? (Number.isFinite(seed) ? seed : 0),
        }),
        motifTimeoutMs,
        "motif-mining",
      );

      let miningResult = rawMiningResult;
      if (rawMiningResult && rawMiningResult.__timedOut) {
        if (logger) {
          logger.warn({ generation, timeoutMs: motifTimeoutMs }, "motif mining timed out — skipping");
        }
        miningResult = null;
      }

      if (miningResult && miningResult.motifEffects.length > 0 && motifInjectIndex >= 0) {
        mutationOperators[motifInjectIndex] = createMotifInjectMutation(miningResult.motifEffects);
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
        ...(maxMutationRetries !== undefined ? { maxMutationRetries } : {}),
        ...(offspringPerParent !== undefined ? { offspringPerParent } : {}),
      });

      let evolvedPopulation = evolutionResult.population;
      pendingOperatorNames = evolutionResult.operatorNames;

      const minPopulationSize = runnerConfig.minPopulationSize;
      if (Number.isInteger(minPopulationSize) && minPopulationSize > 0 && rng) {
        const replenished = replenishPopulation(evolvedPopulation, {
          minSize: minPopulationSize,
          rng,
          grammarConfig: config.seeding?.generate?.grammar,
        });
        if (replenished.injectedCount > 0) {
          evolvedPopulation = replenished.population;
          pendingOperatorNames = [
            ...pendingOperatorNames,
            ...new Array(replenished.injectedCount).fill(null),
          ];
          if (logger) {
            logger.info(
              { injectedCount: replenished.injectedCount, generation },
              "population replenished",
            );
          }
        }
      }

      assertPopulation(evolvedPopulation);

      const determinism = assembleDeterminism(options.determinism, rng, seed);

      const { feedback, preferenceModelSnapshots, health, preferenceMetrics } = await buildGenerationContext({
        generation,
        runId,
        baseDir,
        loopResult,
        population: evolvedPopulation,
        feedbackEnabled,
        feedbackProvider,
        snapshotProvider,
        seed,
        telemetry,
      });

      const debugLog = {
        generation,
        timestamp: new Date().toISOString(),
        populationSize: evolvedPopulation.length,
        evaluatedCount: loopResult.evaluated.length,
        rejectedCount: loopResult.rejected.length,
        rejectionReasons: loopResult.rejected.map((r) => ({
          genomeId: r.genome?.id ?? null,
          reason: r.reason,
        })),
        evaluatedSummary: loopResult.evaluated.map((e) => ({
          genomeId: e.genome?.id ?? null,
          fitness: e.fitness,
        })),
      };

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
        health,
        preferenceMetrics,
        debugLog,
      });

      if (runnerConfig.maxRetainedGenerations != null) {
        await pruneOldGenerations({
          baseDir,
          runId,
          maxRetained: runnerConfig.maxRetainedGenerations,
        });
      }

      return {
        loopResult,
        evolvedPopulation,
        artifacts,
      };
      }; // end generationBody

      const genResult = await withTimeout(
        generationBody(),
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
