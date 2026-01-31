import { loadConfigFile } from "../config/loader.js";
import { METRIC_IDS } from "./metric-ids.js";

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

const FALLBACK_FEATURE_ORDER = [...METRIC_IDS];

const FALLBACK_DEGENERACY_ORDER = [
  "loop",
  "stalemate",
  "forced-move",
  "dominant-action",
  "trivial-win",
  "no-choices",
  "non-terminating",
  "high-skipped-effects",
  "any-cost-abort",
  "high-skipped-triggers",
  "high-pass-rate",
  "high-no-legal-actions-termination",
  "non-finite-metrics",
];

const DEFAULT_FEATURE_ORDER = Array.isArray(DEFAULT_METRICS_CORE_CONFIG?.featureOrder)
  ? DEFAULT_METRICS_CORE_CONFIG.featureOrder.slice()
  : FALLBACK_FEATURE_ORDER;

const DEFAULT_DEGENERACY_ORDER = Array.isArray(DEFAULT_DEGENERACY_CONFIG?.enabledFlags)
  ? DEFAULT_DEGENERACY_CONFIG.enabledFlags.slice()
  : FALLBACK_DEGENERACY_ORDER;

const NON_FINITE_POLICY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinite ?? "zero";

const NON_FINITE_POLICY_MODE = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePolicy ?? "penalize";
const NON_FINITE_PER_KEY_PENALTY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePenalty?.perKeyPenalty ?? 0.05;
const NON_FINITE_MAX_PENALTY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePenalty?.maxPenalty ?? 0.50;

/**
 * @param {number} nonFiniteCount - Number of non-finite metric keys
 * @param {number} perKeyPenalty
 * @param {number} maxPenalty
 * @returns {number} Multiplier in [0, 1]
 */
function computeNonFinitePenaltyMultiplier(nonFiniteCount, perKeyPenalty, maxPenalty) {
  if (nonFiniteCount <= 0) return 1;
  const penalty = Math.min(maxPenalty, nonFiniteCount * perKeyPenalty);
  return Math.max(0, 1 - penalty);
}

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
  const nonFiniteKeys = [];

  for (const metric of metricList) {
    if (!metric || typeof metric.id !== "string") {
      continue;
    }
    if (!Number.isFinite(metric.value)) {
      nonFiniteKeys.push(metric.id);
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

  return { vector, nonFiniteKeys };
}

export {
  DEFAULT_FEATURE_ORDER,
  DEFAULT_DEGENERACY_ORDER,
  NON_FINITE_POLICY_MODE,
  NON_FINITE_PER_KEY_PENALTY,
  NON_FINITE_MAX_PENALTY,
  computeNonFinitePenaltyMultiplier,
  assembleFeatureVector,
};
