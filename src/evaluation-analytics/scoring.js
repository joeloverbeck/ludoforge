function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function resolveWeights(featureVector, weights, defaultWeight) {
  const resolved = new Map();
  const defaults = Number.isFinite(defaultWeight) ? defaultWeight : 0;
  const sourceWeights = weights && typeof weights === "object" ? weights : null;
  const featureKeys = featureVector && typeof featureVector === "object" ? Object.keys(featureVector) : [];

  for (const key of featureKeys) {
    const weight = sourceWeights && Object.prototype.hasOwnProperty.call(sourceWeights, key)
      ? sourceWeights[key]
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
  const weights = options.weights;
  const objectives = computeObjectiveScores(featureVector, options.objectives, options);

  let score = 0;
  if (weights && typeof weights === "object" && Object.keys(weights).length > 0) {
    const resolved = resolveWeights(featureVector, weights, defaultWeight);
    score = computeWeightedScore(featureVector, resolved, normalize);
  } else if (objectives) {
    const objectiveValues = Object.values(objectives);
    score =
      objectiveValues.length > 0
        ? objectiveValues.reduce((sum, value) => sum + safeNumber(value), 0) / objectiveValues.length
        : 0;
  } else {
    const resolved = resolveWeights(featureVector, null, defaultWeight);
    score = computeWeightedScore(featureVector, resolved, normalize);
  }

  return {
    score,
    components: includeComponents ? { ...(featureVector ?? {}) } : undefined,
    objectives,
  };
}

export { computeCompositeScore, computeObjectiveScores };
