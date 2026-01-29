import { loadConfigFile } from "../config/loader.js";

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultMetricsCoreConfig() {
  const result = await loadConfigFile({ name: "metrics-core" });
  if (!result.valid) {
    throw new Error(
      `Metrics core config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

async function loadDefaultDegeneracyConfig() {
  const result = await loadConfigFile({ name: "degeneracy" });
  if (!result.valid) {
    throw new Error(
      `Degeneracy config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_METRICS_CORE_CONFIG = await loadDefaultMetricsCoreConfig();
const DEFAULT_DEGENERACY_CONFIG = await loadDefaultDegeneracyConfig();

const FALLBACK_FEATURE_ORDER = [
  "agency",
  "strategic_depth",
  "seat_imbalance",
  "variety",
  "pacing_tension",
  "turn_taking_rate",
  "interaction_rate",
];

const FALLBACK_DEGENERACY_ORDER = [
  "loop",
  "stalemate",
  "forced-move",
  "dominant-action",
  "trivial-win",
  "no-choices",
  "non-terminating",
];

const DEFAULT_FEATURE_ORDER = Array.isArray(DEFAULT_METRICS_CORE_CONFIG?.featureOrder)
  ? DEFAULT_METRICS_CORE_CONFIG.featureOrder.slice()
  : FALLBACK_FEATURE_ORDER;

const DEFAULT_DEGENERACY_ORDER = Array.isArray(DEFAULT_DEGENERACY_CONFIG?.enabledFlags)
  ? DEFAULT_DEGENERACY_CONFIG.enabledFlags.slice()
  : FALLBACK_DEGENERACY_ORDER;

const NON_FINITE_POLICY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinite ?? "zero";

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeMetricValue(value) {
  if (NON_FINITE_POLICY === "zero") {
    return safeNumber(value);
  }
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
