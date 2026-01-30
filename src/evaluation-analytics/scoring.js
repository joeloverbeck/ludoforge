function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const DEFAULT_PREFERENCE_CAP = 0.25;
const DEFAULT_PREFERENCE_BOOTSTRAP_CAP = 0.1;
const DEFAULT_PREFERENCE_BOOTSTRAP_SAMPLES = 20;
const DEFAULT_PREFERENCE_WEIGHT = 1;

function resolvePreferenceCap(options = {}) {
  const cap = Math.max(0, safeNumber(options.preferenceCap ?? DEFAULT_PREFERENCE_CAP));
  const bootstrapCap = Math.max(
    0,
    safeNumber(options.preferenceBootstrapCap ?? DEFAULT_PREFERENCE_BOOTSTRAP_CAP)
  );
  const bootstrapSamples = safeNumber(
    options.preferenceBootstrapSamples ?? DEFAULT_PREFERENCE_BOOTSTRAP_SAMPLES
  );
  const sampleCount = safeNumber(options.preferenceSampleCount ?? 0);

  if (bootstrapSamples > 0 && sampleCount < bootstrapSamples) {
    return Math.min(cap, bootstrapCap);
  }
  return cap;
}

function computePreferenceContribution(preferenceScore, options = {}) {
  const cap = resolvePreferenceCap(options);
  if (options.allowPreference === false) {
    return { contribution: 0, cap };
  }
  if (!Number.isFinite(preferenceScore)) {
    return { contribution: 0, cap };
  }
  const weight = safeNumber(options.preferenceWeight ?? DEFAULT_PREFERENCE_WEIGHT);
  if (cap <= 0 || weight === 0) {
    return { contribution: 0, cap };
  }
  const uncertainty = clamp(safeNumber(options.preferenceUncertainty), 0, 1);
  const centered = (preferenceScore - 0.5) * 2;
  const weighted = centered * weight * (1 - uncertainty);
  return { contribution: clamp(weighted, -cap, cap), cap };
}

function resolveWeights(featureVector, weights, defaultWeight, defaultWeights) {
  const resolved = new Map();
  const defaults = Number.isFinite(defaultWeight) ? defaultWeight : 0;
  const sourceWeights = weights && typeof weights === "object" ? weights : null;
  const sourceDefaultWeights =
    defaultWeights && typeof defaultWeights === "object" ? defaultWeights : null;
  const featureKeys = featureVector && typeof featureVector === "object" ? Object.keys(featureVector) : [];

  for (const key of featureKeys) {
    const weight = sourceWeights && Object.prototype.hasOwnProperty.call(sourceWeights, key)
      ? sourceWeights[key]
      : sourceDefaultWeights && Object.prototype.hasOwnProperty.call(sourceDefaultWeights, key)
        ? sourceDefaultWeights[key]
        : defaults;
    resolved.set(key, safeNumber(weight));
  }

  return resolved;
}

function normalizeWeights(weightMap) {
  let total = 0;
  for (const weight of weightMap.values()) {
    total += Math.abs(weight);
  }
  if (total <= 0) {
    return { weights: weightMap, total: 0 };
  }
  const normalized = new Map();
  for (const [key, weight] of weightMap.entries()) {
    normalized.set(key, weight / total);
  }
  return { weights: normalized, total };
}

function computeWeightedScore(featureVector, weights, normalize) {
  if (!weights || weights.size === 0) {
    return 0;
  }
  const { weights: normalizedWeights, total } = normalize ? normalizeWeights(weights) : { weights, total: 1 };
  if (normalize && total <= 0) {
    return 0;
  }
  let score = 0;
  for (const [key, weight] of normalizedWeights.entries()) {
    const value = featureVector && typeof featureVector === "object" ? featureVector[key] : 0;
    score += safeNumber(value) * weight;
  }
  return score;
}

function computeObjectiveScores(featureVector, objectives, options = {}) {
  if (!objectives || typeof objectives !== "object") {
    return undefined;
  }
  const normalize = options.normalizeWeights ?? true;
  const defaultWeight = options.objectiveDefaultWeight ?? 0;
  const entries = Object.entries(objectives);
  if (!entries.length) {
    return undefined;
  }
  const results = {};
  for (const [name, weights] of entries) {
    const resolved = resolveWeights(featureVector, weights, defaultWeight);
    results[name] = computeWeightedScore(featureVector, resolved, normalize);
  }
  return results;
}

function computeCompositeScore(featureVector, options = {}) {
  const normalize = options.normalizeWeights ?? true;
  const includeComponents = options.includeComponents ?? true;
  const defaultWeight = options.defaultWeight ?? 1;
  const defaultWeights = options.defaultWeights;
  const weights = options.weights;
  const objectives = computeObjectiveScores(featureVector, options.objectives, options);

  let score = 0;
  if (weights && typeof weights === "object" && Object.keys(weights).length > 0) {
    const resolved = resolveWeights(featureVector, weights, defaultWeight, defaultWeights);
    score = computeWeightedScore(featureVector, resolved, normalize);
  } else if (objectives) {
    const objectiveValues = Object.values(objectives);
    score =
      objectiveValues.length > 0
        ? objectiveValues.reduce((sum, value) => sum + safeNumber(value), 0) / objectiveValues.length
        : 0;
  } else {
    const resolved = resolveWeights(featureVector, null, defaultWeight, defaultWeights);
    score = computeWeightedScore(featureVector, resolved, normalize);
  }

  return {
    score,
    components: includeComponents ? { ...(featureVector ?? {}) } : undefined,
    objectives,
  };
}

function combineFitnessScores(compositeScore, preferenceScore, optionsOrLegacy, maybeOptions = {}) {
  const options =
    optionsOrLegacy && typeof optionsOrLegacy === "object"
      ? optionsOrLegacy
      : maybeOptions ?? {};
  const base = safeNumber(compositeScore);
  const { contribution: preferenceContribution, cap } = computePreferenceContribution(
    preferenceScore,
    options
  );
  const degeneracyPenalty = clamp(safeNumber(options.degeneracyPenalty), 0, 1);
  const combined = base + preferenceContribution;
  const penaltyMultiplier = 1 - degeneracyPenalty;

  return {
    score: combined * penaltyMultiplier,
    components: {
      base,
      preference: preferenceContribution,
      preferenceCap: cap,
      degeneracyPenalty,
    },
  };
}

export { computeCompositeScore, computeObjectiveScores, combineFitnessScores };
