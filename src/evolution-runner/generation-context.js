import { computePreferenceMetrics } from "../evaluation-analytics/preference-metrics.js";
import { computeHealthMetrics } from "./health-metrics.js";
import { defaultPreferenceModelSnapshot } from "./serialization-utils.js";
import { assertNonEmptyArray } from "./runner-validation.js";

/**
 * Builds the generation context: resolves feedback, preference model snapshots,
 * and computes health metrics.
 *
 * @param {object} params
 * @param {number} params.generation
 * @param {string} params.runId
 * @param {string} params.baseDir
 * @param {object} params.loopResult
 * @param {Array} params.population
 * @param {boolean} params.feedbackEnabled
 * @param {Function|null} params.feedbackProvider
 * @param {Function|null} params.snapshotProvider
 * @param {number|undefined} params.seed
 * @param {object} params.telemetry
 * @returns {Promise<{ feedback: any, preferenceModelSnapshots: Array, health: object, preferenceMetrics: object|undefined }>}
 */
export async function buildGenerationContext({
  generation,
  runId,
  baseDir,
  loopResult,
  population,
  feedbackEnabled,
  feedbackProvider,
  snapshotProvider,
  seed,
  telemetry,
}) {
  const generationContext = {
    generation,
    runId,
    baseDir,
    loopResult,
    population,
  };

  const feedback =
    feedbackEnabled && feedbackProvider ? await feedbackProvider(generationContext) : undefined;

  const preferenceModelSnapshots = snapshotProvider
    ? snapshotProvider(generationContext)
    : [defaultPreferenceModelSnapshot({ runId, generation, seed })];
  assertNonEmptyArray(preferenceModelSnapshots, "Preference model snapshots");

  const health = computeHealthMetrics({
    evaluated: loopResult.evaluated,
    rejected: loopResult.rejected,
    mapElites: loopResult.mapElites,
    telemetry,
  });

  const comparisonSamples = Array.isArray(feedback)
    ? feedback.filter((s) => s && s.type === "comparison")
    : [];

  const preferenceMetrics =
    comparisonSamples.length > 0
      ? computePreferenceMetrics(
          preferenceModelSnapshots[0]?.models?.[0] ?? { weights: {}, bias: 0 },
          comparisonSamples,
        )
      : undefined;

  return { feedback, preferenceModelSnapshots, health, preferenceMetrics };
}
