/**
 * Config loading, defaults, and safe number coercion for the preference model.
 * Owns the top-level await that loads configs/preference-model.json.
 */

import { loadConfigFile } from "../../config/loader.js";

const FALLBACK_LEARNING_RATE = 0.05;
const FALLBACK_MAX_HISTORY = 100;
const FALLBACK_COMPARISON_WEIGHT = 1.0;
const FALLBACK_RATING_WEIGHT = 0.25;
const FALLBACK_WEIGHT_DECAY = 0.0;
const FALLBACK_MAX_WEIGHT_ABS = 5.0;
const FALLBACK_MAX_BIAS_ABS = 5.0;
const FALLBACK_ENSEMBLE_SIZE = 5;

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

async function loadDefaultPreferenceModelConfig() {
  const result = await loadConfigFile({ name: "preference-model" });
  if (!result.valid) {
    throw new Error(
      `Preference model config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

function safeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function safeInteger(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

const DEFAULT_PREFERENCE_MODEL_CONFIG = await loadDefaultPreferenceModelConfig();

const DEFAULT_LEARNING_RATE = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.learningRate,
  FALLBACK_LEARNING_RATE
);
const DEFAULT_MAX_HISTORY = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxHistory,
  FALLBACK_MAX_HISTORY
);
const DEFAULT_COMPARISON_WEIGHT = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.comparisonWeight,
  FALLBACK_COMPARISON_WEIGHT
);
const DEFAULT_RATING_WEIGHT = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.ratingWeight,
  FALLBACK_RATING_WEIGHT
);
const DEFAULT_WEIGHT_DECAY = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.weightDecay,
  FALLBACK_WEIGHT_DECAY
);
const DEFAULT_MAX_WEIGHT_ABS = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxWeightAbs,
  FALLBACK_MAX_WEIGHT_ABS
);
const DEFAULT_MAX_BIAS_ABS = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.maxBiasAbs,
  FALLBACK_MAX_BIAS_ABS
);
const DEFAULT_ENSEMBLE_SIZE = safeNumber(
  DEFAULT_PREFERENCE_MODEL_CONFIG?.ensembleSize,
  FALLBACK_ENSEMBLE_SIZE
);

export {
  FALLBACK_LEARNING_RATE,
  FALLBACK_MAX_HISTORY,
  FALLBACK_COMPARISON_WEIGHT,
  FALLBACK_RATING_WEIGHT,
  FALLBACK_WEIGHT_DECAY,
  FALLBACK_MAX_WEIGHT_ABS,
  FALLBACK_MAX_BIAS_ABS,
  FALLBACK_ENSEMBLE_SIZE,
  formatValidationErrors,
  loadDefaultPreferenceModelConfig,
  safeNumber,
  safeInteger,
  DEFAULT_LEARNING_RATE,
  DEFAULT_MAX_HISTORY,
  DEFAULT_COMPARISON_WEIGHT,
  DEFAULT_RATING_WEIGHT,
  DEFAULT_WEIGHT_DECAY,
  DEFAULT_MAX_WEIGHT_ABS,
  DEFAULT_MAX_BIAS_ABS,
  DEFAULT_ENSEMBLE_SIZE,
};
