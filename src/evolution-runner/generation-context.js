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
 * @param {{ shouldPrompt: boolean, budget: number, reasonCodes: string[] }|undefined} [params.feedbackPlan]
 * @param {number|undefined} [params.plannedBudget] - pre-computed adaptive budget to forward to feedbackProvider
 * @param {Function|null} params.snapshotProvider
 * @param {number|undefined} params.seed
 * @param {object} params.telemetry
 * @param {object|null} [params.logger]
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
  feedbackPlan,
  plannedBudget,
  snapshotProvider,
  seed,
  telemetry,
  logger = null,
}) {
  const generationContext = {
    generation,
    runId,
    baseDir,
    loopResult,
    population,
    ...(Number.isFinite(plannedBudget) ? { plannedBudget } : {}),
  };

  const planAllowsPrompt = feedbackPlan === undefined || (feedbackPlan.shouldPrompt && feedbackPlan.budget > 0);
  const willCallFeedbackProvider = !!(feedbackEnabled && feedbackProvider && planAllowsPrompt);

  if (logger) {
    logger.info(
      { feedbackEnabled, hasFeedbackProvider: !!feedbackProvider, planAllowsPrompt, willCallFeedbackProvider },
      "generation-context: feedback decision",
    );
  }

  let feedback;
  if (willCallFeedbackProvider) {
    if (logger) {
      logger.warn("generation-context: calling feedbackProvider (may block on stdin)");
      logger.flush?.();
      // Yield to let any remaining async log output settle
      await new Promise((r) => setTimeout(r, 200));
    }
    // Direct stderr write guarantees user sees something before stdin blocks
    process.stderr.write("\n[feedback] Waiting for human input...\n");
    feedback = await feedbackProvider(generationContext);
    if (logger) {
      logger.info("generation-context: feedbackProvider returned");
    }
  }

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
