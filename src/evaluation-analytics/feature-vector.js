const DEFAULT_FEATURE_ORDER = [
  "agency",
  "strategic_depth",
  "skill_expression",
  "variety",
  "pacing_tension",
  "interaction_rate",
];

const DEFAULT_DEGENERACY_ORDER = [
  "loop",
  "stalemate",
  "forced-move",
  "dominant-action",
  "trivial-win",
  "no-choices",
  "non-terminating",
];

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeMetricValue(value) {
  return safeNumber(value);
}

function assembleFeatureVector(metrics, degeneracy, options = {}) {
  const metricList = Array.isArray(metrics) ? metrics : [];
  const metricMap = new Map();

  for (const metric of metricList) {
    if (!metric || typeof metric.id !== "string") {
      continue;
    }
    metricMap.set(metric.id, normalizeMetricValue(metric.value));
  }

  const metricOrder = options.metricOrder ?? DEFAULT_FEATURE_ORDER;
  const includeDegeneracy = options.includeDegeneracy ?? true;

  const vector = {};
  const seenMetrics = new Set();

  for (const metricId of metricOrder) {
    if (typeof metricId !== "string") {
      continue;
    }
    seenMetrics.add(metricId);
    vector[metricId] = normalizeMetricValue(metricMap.get(metricId));
  }

  const remainingMetrics = Array.from(metricMap.keys())
    .filter((metricId) => !seenMetrics.has(metricId))
    .sort();

  for (const metricId of remainingMetrics) {
    vector[metricId] = normalizeMetricValue(metricMap.get(metricId));
  }

  if (includeDegeneracy) {
    const prefix = options.degeneracyPrefix ?? "degeneracy.";
    const degeneracyFlags = new Set(Array.isArray(degeneracy?.flags) ? degeneracy.flags : []);
    const degeneracyOrder = options.degeneracyOrder ?? DEFAULT_DEGENERACY_ORDER;
    const seenFlags = new Set();

    for (const flag of degeneracyOrder) {
      if (typeof flag !== "string") {
        continue;
      }
      seenFlags.add(flag);
      vector[`${prefix}${flag}`] = degeneracyFlags.has(flag) ? 1 : 0;
    }

    const extraFlags = Array.from(degeneracyFlags)
      .filter((flag) => !seenFlags.has(flag))
      .sort();

    for (const flag of extraFlags) {
      vector[`${prefix}${flag}`] = 1;
    }
  }

  return vector;
}

export { DEFAULT_FEATURE_ORDER, DEFAULT_DEGENERACY_ORDER, assembleFeatureVector };
