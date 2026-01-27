const DEFAULT_BUCKET_SIZE = 0.1;

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

function computeLinearScore(state, featureVector) {
  return dotProduct(state?.weights, featureVector) + safeNumber(state?.bias);
}

function normalizeBucketSize(value) {
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BUCKET_SIZE;
}

function buildBuckets(bucketSize) {
  const count = Math.max(1, Math.ceil(1 / bucketSize));
  return Array.from({ length: count }, (_, index) => {
    const lower = index * bucketSize;
    const upper = index === count - 1 ? 1 : (index + 1) * bucketSize;
    return {
      lowerBound: lower,
      upperBound: upper,
      count: 0,
      averagePredicted: 0,
      averageOutcome: 0,
      predictedSum: 0,
      outcomeSum: 0,
    };
  });
}

function finalizeBuckets(buckets) {
  return buckets.map((bucket) => {
    const count = bucket.count;
    return {
      lowerBound: bucket.lowerBound,
      upperBound: bucket.upperBound,
      count,
      averagePredicted: count > 0 ? bucket.predictedSum / count : 0,
      averageOutcome: count > 0 ? bucket.outcomeSum / count : 0,
    };
  });
}

function computePreferenceMetrics(state, samples, options = {}) {
  const bucketSize = normalizeBucketSize(options.bucketSize);
  const buckets = buildBuckets(bucketSize);
  let total = 0;
  let correct = 0;
  let ties = 0;

  for (const sample of samples ?? []) {
    if (!sample || sample.type !== "comparison") {
      continue;
    }
    const linearA = computeLinearScore(state, sample.featureA);
    const linearB = computeLinearScore(state, sample.featureB);
    const delta = linearA - linearB;
    const predicted = delta > 0 ? "a" : delta < 0 ? "b" : "tie";
    const preferred = sample.preferred;

    total += 1;
    if (preferred === "tie") {
      ties += 1;
    }
    if ((preferred === "a" && predicted === "a") || (preferred === "b" && predicted === "b")) {
      correct += 1;
    }

    const probability = sigmoid(delta);
    const outcome = preferred === "a" ? 1 : 0;
    const bucketIndex = Math.min(Math.floor(probability / bucketSize), buckets.length - 1);
    const bucket = buckets[bucketIndex];
    bucket.count += 1;
    bucket.predictedSum += probability;
    bucket.outcomeSum += outcome;
  }

  return {
    accuracy: total > 0 ? correct / total : 0,
    correct,
    total,
    ties,
    bucketSize,
    calibrationBuckets: finalizeBuckets(buckets),
  };
}

export { computePreferenceMetrics };
