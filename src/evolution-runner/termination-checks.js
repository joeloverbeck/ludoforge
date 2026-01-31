import { writeGenerationArtifacts } from "./artifact-writer.js";
import { serializeTelemetry } from "./operator-telemetry.js";
import { computeHealthMetrics } from "./health-metrics.js";
import {
  serializeMapElites,
  defaultPreferenceModelSnapshot,
} from "./serialization-utils.js";

/**
 * Finds the most common rejection reason from a list of rejected entries.
 *
 * @param {Array<{reason?: string}>} rejected
 * @returns {string} The dominant rejection reason, or "unknown"
 */
export function findDominantRejectionReason(rejected) {
  const reasonCounts = new Map();
  for (const entry of rejected) {
    const reason = entry.reason ?? "unknown";
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  let dominantReason = "unknown";
  let dominantCount = 0;
  for (const [reason, count] of reasonCounts) {
    if (count > dominantCount) {
      dominantReason = reason;
      dominantCount = count;
    }
  }
  return dominantReason;
}

/**
 * Checks whether the evolution should halt due to sustained high rejection rate.
 *
 * @param {object} params
 * @param {number} params.rejectionRate
 * @param {number} params.rejectionRateThreshold
 * @param {number} params.consecutiveHighRejections - Current counter value
 * @param {number} params.maxConsecutiveRejections
 * @param {number} params.generation
 * @param {Array<{reason?: string}>} params.rejected
 * @param {object|null} params.logger
 * @returns {{ haltedReason: object|null, consecutiveHighRejections: number }}
 */
export function checkHighRejectionHalt({
  rejectionRate,
  rejectionRateThreshold,
  consecutiveHighRejections,
  maxConsecutiveRejections,
  generation,
  rejected,
  logger,
}) {
  let updated = consecutiveHighRejections;

  if (rejectionRate > rejectionRateThreshold) {
    updated += 1;
  } else {
    updated = 0;
  }

  if (updated >= maxConsecutiveRejections) {
    const dominantReason = findDominantRejectionReason(rejected);

    const haltedReason = {
      generation,
      rejectionRate,
      consecutiveHighRejections: updated,
      dominantReason,
    };

    if (logger) {
      logger.warn(haltedReason, "evolution halted due to high rejection rate");
    }

    return { haltedReason, consecutiveHighRejections: updated };
  }

  return { haltedReason: null, consecutiveHighRejections: updated };
}

/**
 * Checks whether the population has gone extinct and writes final artifacts if so.
 *
 * @param {object} params
 * @param {number} params.generation
 * @param {object} params.loopResult
 * @param {Array} params.currentPopulation
 * @param {object} params.telemetry
 * @param {Function|null} params.snapshotProvider
 * @param {string} params.runId
 * @param {string} params.baseDir
 * @param {number|undefined} params.seed
 * @param {object|null} params.logger
 * @returns {Promise<{ haltedReason: object, artifacts: object }|null>}
 */
export async function checkPopulationExtinction({
  generation,
  loopResult,
  currentPopulation,
  telemetry,
  snapshotProvider,
  runId,
  baseDir,
  seed,
  logger,
}) {
  if (loopResult.nextGeneration.length > 0) {
    return null;
  }

  const haltedReason = {
    generation,
    cause: "population-extinction",
    evaluated: loopResult.evaluated.length,
    rejected: loopResult.rejected.length,
  };

  if (logger) {
    logger.warn(haltedReason, "evolution halted: no viable genomes survived evaluation");
  }

  const health = computeHealthMetrics({
    evaluated: loopResult.evaluated,
    rejected: loopResult.rejected,
    mapElites: loopResult.mapElites,
    telemetry,
  });

  const preferenceModelSnapshots = snapshotProvider
    ? snapshotProvider({ generation, runId, baseDir, loopResult, population: currentPopulation })
    : [defaultPreferenceModelSnapshot({ runId, generation, seed })];

  const artifacts = await writeGenerationArtifacts({
    baseDir,
    runId,
    generation,
    population: currentPopulation.map((genome) => ({
      id: genome.id,
      definition: genome.definition,
    })),
    evaluated: loopResult.evaluated,
    rejected: loopResult.rejected,
    mapElites: serializeMapElites(loopResult.mapElites),
    shortlist: loopResult.shortlist,
    preferenceModelSnapshots,
    operatorStats: serializeTelemetry(telemetry),
    health,
  });

  return { haltedReason, artifacts };
}
