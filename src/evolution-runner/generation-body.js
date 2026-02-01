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
import { checkPopulationExtinction } from "./termination-checks.js";
import { buildGenerationContext } from "./generation-context.js";
import { runMotifMiningPipeline } from "./motif-pipeline.js";
import { createMotifInjectMutation } from "../evolutionary-engine/mutation/operators/motif-inject.js";
import { resolveRunDir, resolveRunPath } from "./run-layout.js";
import { DEFAULT_RUNNER_LAYOUT, formatGenerationDirName } from "./runner-defaults.js";
import { advanceController } from "./preference-controller.js";
import { decideFeedbackPlan } from "./feedback-plan.js";
import { buildPreferenceHealth } from "./preference-health.js";
import { distillTasteVector } from "../evaluation-analytics/taste-vector.js";
import { computeControllerInputs } from "./controller-inputs.js";

/**
 * @param {object} params
 * @returns {{ generation: number, timestamp: string, populationSize: number, evaluatedCount: number, rejectedCount: number, rejectionReasons: Array, evaluatedSummary: Array }}
 */
export function buildDebugLog({ generation, evolvedPopulation, loopResult }) {
  return {
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
}

/**
 * Executes a single generation's body: evaluate, evolve, write artifacts.
 *
 * @param {object} params
 * @param {object} params.withTimeout - timeout wrapper function
 * @returns {Promise<{ __halt: true, haltedReason: object } | { loopResult: object, evolvedPopulation: Array, artifacts: object, pendingOperatorNames: Array|null, mutationOperators: Array }>}
 */
export async function executeGenerationBody({
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
  totalSamples,
  previousMetricIds,
  lastCalibrationGen,
  runId,
  baseDir,
  seed,
  logger,
  withTimeout,
}) {
  if (logger) {
    logger.info(
      { generation, totalGenerations: runnerConfig.generations, populationSize: currentPopulation.length },
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

  const genDir = resolveRunPath(
    resolveRunDir(baseDir, runId),
    formatGenerationDirName(DEFAULT_RUNNER_LAYOUT.artifacts.generationDirPattern, generation),
  );
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

  // Immutable copy: replace the motif-inject operator without mutating the original array
  let updatedMutationOperators = mutationOperators;
  if (miningResult && miningResult.motifEffects.length > 0 && motifInjectIndex >= 0) {
    updatedMutationOperators = mutationOperators.map((op, i) =>
      i === motifInjectIndex ? createMotifInjectMutation(miningResult.motifEffects) : op,
    );
  }

  const evolutionResult = applyEvolution(loopResult.nextGeneration, {
    rng: rng ?? undefined,
    mutationRate,
    crossoverRate,
    mutationOperators: updatedMutationOperators,
    crossoverOperators: options.crossoverOperators,
    repairOperators: options.repairOperators,
    mutationSelector,
    telemetry,
    ...(maxMutationRetries !== undefined ? { maxMutationRetries } : {}),
    ...(offspringPerParent !== undefined ? { offspringPerParent } : {}),
  });

  let evolvedPopulation = evolutionResult.population;
  let newPendingOperatorNames = evolutionResult.operatorNames;

  const maxPopSize = runnerConfig.maxPopulationSize ?? config.seeding?.populationSize ?? Infinity;
  if (Number.isFinite(maxPopSize) && evolvedPopulation.length > maxPopSize) {
    evolvedPopulation = evolvedPopulation.slice(0, maxPopSize);
    newPendingOperatorNames = newPendingOperatorNames.slice(0, maxPopSize);
  }

  const minPopulationSize = runnerConfig.minPopulationSize;
  if (Number.isInteger(minPopulationSize) && minPopulationSize > 0 && rng) {
    const replenished = replenishPopulation(evolvedPopulation, {
      minSize: minPopulationSize,
      rng,
      grammarConfig: config.seeding?.generate?.grammar,
    });
    if (replenished.injectedCount > 0) {
      evolvedPopulation = replenished.population;
      newPendingOperatorNames = [
        ...newPendingOperatorNames,
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

  // --- Preference controller integration ---
  const plConfig = config.preferenceLearning ?? {};
  const freezeConfig = plConfig.controller?.freeze ?? { enabled: false, minTotalSamples: 0, freezeAfterStableGens: 1, stableUncertaintyThreshold: 0.3, requireNoNewMetricIds: false };
  const driftConfig = plConfig.controller?.drift ?? { enabled: false, unfreezeUncertaintyThreshold: 0.8, minCalibrationAccuracy: 0.5, ood: { enabled: false, maxOodRate: 0.5 } };
  const calibrationConfig = plConfig.controller?.calibration ?? { enabled: false, everyGens: 1, samples: 0 };
  const baseMaxPerGen = plConfig.budget?.baseMaxPerGen ?? 5;

  // Extract the latest preference model state from snapshots for uncertainty computation.
  // We call snapshotProvider once here and reuse the result to avoid duplicate calls.
  const generationContextForSnapshot = { generation, runId, baseDir, loopResult, population: evolvedPopulation };
  const preSnapshots = snapshotProvider
    ? snapshotProvider(generationContextForSnapshot)
    : null;
  const preferenceModelStateForController = Array.isArray(preSnapshots) && preSnapshots.length > 0
    ? preSnapshots[preSnapshots.length - 1]
    : null;

  const controllerInputs = computeControllerInputs({
    evaluated: loopResult.evaluated,
    preferenceModelState: preferenceModelStateForController,
    totalSamples: totalSamples ?? 0,
    previousMetricIds: previousMetricIds ?? null,
  });

  const controllerResult = controllerState
    ? advanceController({
        state: controllerState,
        freeze: freezeConfig,
        drift: driftConfig,
        totalSamples: controllerInputs.totalSamples,
        meanUncertainty: controllerInputs.meanUncertainty,
        hasNewMetricIds: controllerInputs.hasNewMetricIds,
      })
    : { nextState: { mode: "learning", stableGenCount: 0 }, froze: false, unfroze: false, reasonCodes: [] };
  const nextControllerState = controllerResult.nextState;

  const feedbackPlan = decideFeedbackPlan({
    controllerState: nextControllerState,
    calibration: calibrationConfig,
    generation,
    lastCalibrationGen: lastCalibrationGen ?? null,
    adaptiveBudgetResult: { budget: baseMaxPerGen, unfreezeRequired: controllerResult.unfroze },
    baseMaxPerGen,
  });

  const { feedback, preferenceModelSnapshots, health, preferenceMetrics } = await buildGenerationContext({
    generation,
    runId,
    baseDir,
    loopResult,
    population: evolvedPopulation,
    feedbackEnabled,
    feedbackProvider,
    feedbackPlan,
    snapshotProvider,
    seed,
    telemetry,
  });

  const preferenceHealthArtifact = buildPreferenceHealth({
    meanUncertainty: controllerInputs.meanUncertainty,
    oodRate: 0,
    controllerMode: nextControllerState.mode,
    stableGenCount: nextControllerState.stableGenCount,
    plannedBudget: feedbackPlan.budget,
    didPrompt: feedbackPlan.shouldPrompt && feedback !== undefined,
    metricIdDeltaDetected: controllerInputs.hasNewMetricIds,
  });

  const snapshot = Array.isArray(preferenceModelSnapshots) && preferenceModelSnapshots.length > 0
    ? preferenceModelSnapshots[preferenceModelSnapshots.length - 1]
    : null;
  const tasteVectorArtifact = distillTasteVector(snapshot ?? { models: [] });

  const debugLog = buildDebugLog({ generation, evolvedPopulation, loopResult });

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
    preferenceController: nextControllerState,
    preferenceHealth: preferenceHealthArtifact,
    tasteVector: tasteVectorArtifact,
    debugLog,
  });

  if (runnerConfig.maxRetainedGenerations != null) {
    await pruneOldGenerations({
      baseDir,
      runId,
      maxRetained: runnerConfig.maxRetainedGenerations,
    });
  }

  const feedbackCount = Array.isArray(feedback) ? feedback.length : 0;
  const didCalibrate = feedbackPlan.reasonCodes.includes("calibration_due") && feedbackCount > 0;

  return {
    loopResult,
    evolvedPopulation,
    artifacts,
    pendingOperatorNames: newPendingOperatorNames,
    mutationOperators: updatedMutationOperators,
    nextControllerState,
    feedbackCount,
    metricIds: controllerInputs.metricIds,
    didCalibrate,
  };
}
