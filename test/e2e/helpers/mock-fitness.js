import { assembleFeatureVector } from "../../../src/evaluation-analytics/feature-vector.js";
import { applyDegeneracyFilters } from "../../../src/evaluation-analytics/degeneracy.js";
import { computePreferenceAwareFitness } from "../../../src/evaluation-analytics/fitness.js";

const EMPTY_DEGENERACY = Object.freeze({ flags: [] });

function normalizeMetrics(metrics) {
  if (metrics == null) {
    return [];
  }
  if (!Array.isArray(metrics)) {
    throw new Error("Mock fitness requires metrics to be an array.");
  }
  return metrics;
}

function normalizeDegeneracy(degeneracy) {
  if (!degeneracy || typeof degeneracy !== "object") {
    return EMPTY_DEGENERACY;
  }
  const flags = Array.isArray(degeneracy.flags) ? degeneracy.flags : [];
  return { ...degeneracy, flags };
}

function resolveSafetyFailures(artifacts) {
  if (Array.isArray(artifacts?.safetyFailures)) {
    return artifacts.safetyFailures;
  }
  if (Array.isArray(artifacts?.safety?.failures)) {
    return artifacts.safety.failures;
  }
  if (Array.isArray(artifacts?.safety)) {
    return artifacts.safety;
  }
  return [];
}

function resolveFeatureVector({ featureVector, metrics, degeneracy, featureVectorOptions }) {
  if (featureVector != null) {
    if (!featureVector || typeof featureVector !== "object" || Array.isArray(featureVector)) {
      throw new Error("Mock fitness featureVector must be an object.");
    }
    return featureVector;
  }
  const metricList = normalizeMetrics(metrics);
  return assembleFeatureVector(metricList, normalizeDegeneracy(degeneracy), featureVectorOptions);
}

export function createMockFitness(options = {}) {
  function buildFeatureVector(artifacts = {}, overrides = {}) {
    return resolveFeatureVector({
      featureVector: artifacts.featureVector,
      metrics: artifacts.metrics,
      degeneracy: artifacts.degeneracy,
      featureVectorOptions: overrides.featureVectorOptions ?? options.featureVectorOptions,
    });
  }

  function evaluate(artifacts = {}, overrides = {}) {
    const degeneracy = normalizeDegeneracy(artifacts.degeneracy);
    const featureVector = buildFeatureVector(artifacts, overrides);
    const safetyFailures = resolveSafetyFailures(artifacts);

    const baseAllowPreference = overrides.allowPreference ?? options.allowPreference ?? true;
    const gateOnDegeneracy =
      overrides.gatePreferenceOnDegeneracy ?? options.gatePreferenceOnDegeneracy ?? true;
    const gateOnSafety = overrides.gatePreferenceOnSafety ?? options.gatePreferenceOnSafety ?? false;

    const degeneracyDecision = gateOnDegeneracy
      ? applyDegeneracyFilters(degeneracy, overrides.degeneracyFilters ?? options.degeneracyFilters)
      : { allow: true, rejectedFlags: [] };

    const allowPreference =
      baseAllowPreference && degeneracyDecision.allow && (!gateOnSafety || safetyFailures.length === 0);

    const preferenceFitness = computePreferenceAwareFitness(featureVector, {
      ...(options.fitnessOptions ?? {}),
      ...(overrides.fitnessOptions ?? {}),
      preferenceModelState:
        overrides.preferenceModelState ?? options.preferenceModelState ?? undefined,
      compositeScore: overrides.compositeScore ?? options.compositeScore,
      compositeScoreOptions:
        overrides.compositeScoreOptions ?? options.compositeScoreOptions ?? undefined,
      diversityPressure:
        overrides.diversityPressure ?? options.diversityPressure ?? artifacts.diversityPressure,
      allowPreference,
    });

    return {
      fitness: preferenceFitness.score,
      featureVector,
      compositeScore: preferenceFitness.compositeScore,
      descriptors: artifacts.descriptors ?? null,
      diagnostics: {
        preferenceFitness,
        degeneracy,
        degeneracyDecision,
        safetyFailures: safetyFailures.length > 0 ? safetyFailures : null,
      },
    };
  }

  return { evaluate, buildFeatureVector };
}
