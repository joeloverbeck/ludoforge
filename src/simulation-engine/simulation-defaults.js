/**
 * Simulation configuration defaults resolution.
 * @module simulation-engine/simulation-defaults
 */

import { loadConfigFile } from "../config/loader.js";

/**
 * @param {Array} errors
 * @returns {string}
 */
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

/**
 * @returns {Promise<object>}
 */
async function loadDefaultSimulationConfig() {
  const result = await loadConfigFile({ name: "simulation" });
  if (!result.valid) {
    throw new Error(
      `Simulation config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_SIMULATION_CONFIG = await loadDefaultSimulationConfig();

/**
 * @param {*} value
 * @returns {number|undefined}
 */
function resolveOptionalNumber(value) {
  return typeof value === "number" ? value : undefined;
}

/**
 * Merge file-level simulation defaults into a config object.
 * @param {object} config
 * @returns {object}
 */
export function resolveSimulationDefaults(config) {
  if (!config || typeof config !== "object") {
    return config;
  }

  const defaults = config.simulationConfig ?? DEFAULT_SIMULATION_CONFIG ?? {};
  const resolved = { ...config };

  const defaultMaxTurns = resolveOptionalNumber(defaults.maxTurns);
  if (resolved.maxTurns == null && defaultMaxTurns != null) {
    resolved.maxTurns = defaultMaxTurns;
  }

  const defaultMaxSteps = resolveOptionalNumber(defaults.maxSteps);
  if (resolved.maxSteps == null && defaultMaxSteps != null) {
    resolved.maxSteps = defaultMaxSteps;
  }

  const defaultSeed =
    defaults?.rng && typeof defaults.rng.seed === "number" ? defaults.rng.seed : undefined;
  if (resolved.seed == null && !resolved.rng && defaultSeed != null) {
    resolved.seed = defaultSeed;
  }

  const defaultLoopDetection = defaults.loopDetection ?? {};
  const defaultLoopMax =
    defaultLoopDetection.enabled === true &&
    typeof defaultLoopDetection.maxRepeatedStates === "number"
      ? defaultLoopDetection.maxRepeatedStates
      : undefined;
  if (defaultLoopMax != null) {
    if (!resolved.loopDetection || typeof resolved.loopDetection !== "object") {
      resolved.loopDetection = { maxRepeatedStates: defaultLoopMax };
    } else if (resolved.loopDetection.maxRepeatedStates == null) {
      resolved.loopDetection = {
        ...resolved.loopDetection,
        maxRepeatedStates: defaultLoopMax,
      };
    }
  }

  const defaultMaxDecisionSpace = resolveOptionalNumber(defaults.maxDecisionSpace);
  if (resolved.maxDecisionSpace == null && defaultMaxDecisionSpace != null) {
    resolved.maxDecisionSpace = defaultMaxDecisionSpace;
  }

  const hasDefinitionPolicy = Boolean(resolved.definition?.turn?.noLegalActions);
  const hasOverridePolicy = Boolean(resolved.turn?.noLegalActions);
  const defaultNoLegalActions = defaults.turn?.noLegalActions;
  if (!hasDefinitionPolicy && !hasOverridePolicy && defaultNoLegalActions) {
    resolved.turn = {
      ...resolved.turn,
      noLegalActions: defaultNoLegalActions,
    };
  }

  return resolved;
}
