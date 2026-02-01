import { selectActiveLearningPairs } from "../evaluation-analytics/active-learning.js";
import {
  createPreferenceModelState,
  updatePreferenceModelState,
} from "../evaluation-analytics/preference-model.js";
import {
  assemblePreferenceFeedbackComparison,
  promptForPairwiseComparison,
  promptForRating,
} from "./feedback.js";
import { computeAdaptiveBudget } from "../evolution-runner/adaptive-budget.js";
import { resolveCandidatePool } from "../evolution-runner/candidate-pool.js";

function extractCandidates(evaluated) {
  if (!Array.isArray(evaluated)) {
    return [];
  }
  return evaluated
    .filter(
      (entry) =>
        entry &&
        entry.genome &&
        entry.diagnostics &&
        entry.diagnostics.featureVector,
    )
    .map((entry) => ({
      id: entry.genome.id,
      featureVector: entry.diagnostics.featureVector,
      nicheId: entry.nicheId ?? undefined,
    }));
}

function buildActiveLearningOptions(config, generation, maxSamplesPerGen) {
  const al = config.activeLearning;
  return {
    maxPairs: maxSamplesPerGen ?? config.maxSamplesPerGen ?? 5,
    uncertaintyThreshold: al?.uncertaintyThreshold,
    diversityQuota: al?.diversityQuota,
    cadence: al?.cadenceGens ?? al?.cadence,
    iteration: generation,
  };
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

function wrapAsFeedbackRecord(feedback, runId, generation) {
  const createdAt = new Date().toISOString();
  return {
    id: `${runId}-fb-${generation}-${Date.now()}`,
    version: "v1",
    createdAt,
    feedback,
  };
}

function buildSnapshotRecord(modelState, runId, generation, seed) {
  const createdAt = new Date().toISOString();
  const primaryModel =
    Array.isArray(modelState.models) && modelState.models.length > 0
      ? modelState.models[0]
      : { weights: {}, bias: 0, sampleCount: 0 };
  return {
    id: `${runId}-pref-${generation}`,
    version: "v1",
    createdAt,
    ...(Number.isFinite(seed) ? { seed } : {}),
    trainingWindow: { size: modelState.sampleCount ?? 0 },
    hyperparams: {
      learningRate: modelState.learningRate,
      ensembleSize: modelState.ensemble?.size ?? 1,
    },
    metrics: {},
    weights: primaryModel.weights ?? {},
    bias: primaryModel.bias ?? 0,
    models: modelState.models,
    ensemble: modelState.ensemble ?? { size: 1, method: "online-bagging" },
  };
}

/**
 * @param {{
 *   io: import("./prompt.js").HumanIO,
 *   config: { mode?: string, maxSamplesPerGen?: number, activeLearning?: { uncertaintyThreshold?: number, diversityQuota?: number }, adaptiveBudget?: { enabled?: boolean, lowUncertaintyThreshold?: number, highUncertaintyThreshold?: number } },
 *   initialModelState?: import("../evaluation-analytics/types.js").PreferenceModelState,
 *   seed?: number,
 *   candidatePoolConfig?: { source: string, focus: { strategy: string, topQuantile?: number }, maxCandidates: number },
 * }} options
 * @returns {{
 *   feedbackProvider: (context: import("../evolution-runner/runner.js").GenerationContext) => Promise<import("../data-persistence/types.js").FeedbackRecord[]>,
 *   snapshotProvider: (context: import("../evolution-runner/runner.js").GenerationContext) => import("../data-persistence/types.js").PreferenceModelSnapshotRecord[],
 * }}
 */
export function createFeedbackProvider({ io, config, initialModelState, seed, candidatePoolConfig } = {}) {
  if (!io || typeof io.readLine !== "function" || typeof io.writeLine !== "function") {
    throw new Error("createFeedbackProvider requires a valid HumanIO (io)");
  }
  if (!config || typeof config !== "object") {
    throw new Error("createFeedbackProvider requires a config object");
  }

  let currentModelState = initialModelState ?? createPreferenceModelState();
  const mode = config.mode ?? "comparison";
  let previousMetricIds = null;

  async function feedbackProvider(generationContext) {
    const { generation, runId, loopResult } = generationContext;

    let candidates;
    if (candidatePoolConfig && loopResult.elites && loopResult.rng) {
      const poolRaw = resolveCandidatePool({
        source: candidatePoolConfig.source,
        focus: candidatePoolConfig.focus,
        maxCandidates: candidatePoolConfig.maxCandidates,
        evaluated: loopResult.evaluated ?? [],
        elites: loopResult.elites ?? [],
        shortlist: loopResult.shortlist ?? [],
        rng: loopResult.rng,
      });
      candidates = extractCandidates(poolRaw);
    } else {
      candidates = extractCandidates(loopResult.evaluated);
    }
    const metricIds = collectMetricIds(candidates);

    if (candidates.length < 2) {
      if (metricIds.length > 0) {
        previousMetricIds = metricIds;
      }
      return [];
    }

    const adaptiveBudget = config.budget?.adaptive ?? config.adaptiveBudget;
    const baseMaxSamples = config.budget?.baseMaxPerGen ?? config.maxSamplesPerGen ?? 5;
    const { budget: maxSamplesPerGen } = computeAdaptiveBudget({
      preferenceModelState: currentModelState,
      baseMaxSamples,
      metricIds,
      previousMetricIds,
      candidates,
      lowUncertaintyThreshold: adaptiveBudget?.lowUncertaintyThreshold,
      highUncertaintyThreshold: adaptiveBudget?.highUncertaintyThreshold,
      enabled: adaptiveBudget?.enabled === true,
    });
    const alOptions = buildActiveLearningOptions(config, generation, maxSamplesPerGen);
    const pairs = selectActiveLearningPairs(
      candidates,
      currentModelState,
      alOptions,
    );

    if (pairs.length === 0) {
      if (metricIds.length > 0) {
        previousMetricIds = metricIds;
      }
      return [];
    }

    const records = [];

    for (const pair of pairs) {
      io.writeLine(
        `\n--- Generation ${generation}: comparing ${pair.candidateA.id} vs ${pair.candidateB.id} ---`,
      );

      let feedbackSample;

      if (mode === "comparison") {
        const prompt = await promptForPairwiseComparison({ io });
        feedbackSample = assemblePreferenceFeedbackComparison({
          candidateA: pair.candidateA,
          candidateB: pair.candidateB,
          prompt,
        });
      } else {
        io.writeLine(`Rate candidate A (${pair.candidateA.id}):`);
        const ratingA = await promptForRating({ io });
        io.writeLine(`Rate candidate B (${pair.candidateB.id}):`);
        const ratingB = await promptForRating({ io });

        const feedbackA = {
          type: "rating",
          rating: ratingA.rating,
          featureVector: pair.candidateA.featureVector,
        };
        const feedbackB = {
          type: "rating",
          rating: ratingB.rating,
          featureVector: pair.candidateB.featureVector,
        };

        currentModelState = updatePreferenceModelState(
          currentModelState,
          feedbackA,
        );
        records.push(wrapAsFeedbackRecord(feedbackA, runId, generation));

        currentModelState = updatePreferenceModelState(
          currentModelState,
          feedbackB,
        );
        records.push(wrapAsFeedbackRecord(feedbackB, runId, generation));
        continue;
      }

      currentModelState = updatePreferenceModelState(
        currentModelState,
        feedbackSample,
      );
      records.push(wrapAsFeedbackRecord(feedbackSample, runId, generation));
    }

    if (metricIds.length > 0) {
      previousMetricIds = metricIds;
    }

    return records;
  }

  function snapshotProvider(generationContext) {
    const { generation, runId } = generationContext;
    return [buildSnapshotRecord(currentModelState, runId, generation, seed)];
  }

  return { feedbackProvider, snapshotProvider };
}
