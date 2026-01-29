import { applyDegeneracyFilters } from "../evaluation-analytics/degeneracy.js";
import { computePreferenceAwareFitness } from "../evaluation-analytics/fitness.js";

export function createPreferenceEvaluator(computeAnalytics, options = {}) {
  if (typeof computeAnalytics !== "function") {
    throw new Error("Preference evaluator requires an analytics function");
  }

  const { degeneracyFilters, ...fitnessOptions } = options;

  return function preferenceEvaluator(genome) {
    const analytics = computeAnalytics(genome);
    const degeneracyDecision = applyDegeneracyFilters(analytics?.degeneracy, degeneracyFilters);
    const allowPreference = (fitnessOptions.allowPreference ?? true) && degeneracyDecision.allow;

    const preferenceFitness = computePreferenceAwareFitness(analytics.featureVector, {
      ...fitnessOptions,
      compositeScore: analytics.compositeScore ?? fitnessOptions.compositeScore,
      allowPreference,
      degeneracyReport: analytics.degeneracy,
    });

    return {
      fitness: preferenceFitness.score,
      descriptors: analytics.descriptors,
      diagnostics: {
        analytics,
        degeneracy: degeneracyDecision,
        preferenceFitness,
      },
    };
  };
}
