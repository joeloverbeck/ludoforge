function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function entropy(probability) {
  const p = clamp01(probability);
  if (p === 0 || p === 1) {
    return 0;
  }
  return -p * Math.log(p) - (1 - p) * Math.log(1 - p);
}

function dotProduct(weights, featureVector) {
  if (!weights || typeof weights !== "object") {
    return 0;
  }
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const featureValue = featureVector && typeof featureVector === "object" ? featureVector[key] : 0;
    total += safeNumber(weight) * safeNumber(featureValue);
  }
  return total;
}

function resolveModels(state) {
  if (Array.isArray(state?.models) && state.models.length > 0) {
    return state.models;
  }
  if (state && typeof state === "object" && ("weights" in state || "bias" in state)) {
    return [state];
  }
  return [];
}

function computePreferenceScore(state, featureVector) {
  const models = resolveModels(state);
  if (models.length === 0) {
    return {
      score: 0.5,
      confidence: 0,
      pMean: 0.5,
      pVar: 0,
      uncertainty: 1,
      bald: 0,
    };
  }

  let sum = 0;
  let sumSquares = 0;
  let entropySum = 0;
  for (const model of models) {
    const linear = dotProduct(model?.weights, featureVector) + safeNumber(model?.bias);
    const probability = sigmoid(linear);
    sum += probability;
    sumSquares += probability * probability;
    entropySum += entropy(probability);
  }

  const count = models.length;
  const pMean = sum / count;
  const pVar = Math.max(0, sumSquares / count - pMean * pMean);
  const uncertainty = clamp01(2 * Math.sqrt(pVar));
  const bald = Math.max(0, entropy(pMean) - entropySum / count);
  const confidence = 1 - uncertainty;
  const score = pMean;

  return {
    score,
    confidence,
    pMean,
    pVar,
    uncertainty,
    bald,
  };
}

export { computePreferenceScore };
