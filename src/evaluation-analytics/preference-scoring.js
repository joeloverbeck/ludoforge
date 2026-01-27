function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
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

function computePreferenceScore(state, featureVector) {
  const linear = dotProduct(state?.weights, featureVector) + safeNumber(state?.bias);
  const score = sigmoid(linear);
  const confidence = Math.abs(score - 0.5) * 2;
  return { score, confidence };
}

export { computePreferenceScore };
