/**
 * Evolution runner layout defaults loaded from configs/evolution-runner.json.
 * @module evolution-runner/runner-defaults
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
async function loadDefaultRunnerLayout() {
  const result = await loadConfigFile({ name: "evolution-runner" });
  if (!result.valid) {
    throw new Error(
      `Evolution runner config validation failed:\n${formatValidationErrors(result.errors)}`,
    );
  }
  return result.config;
}

/** @type {import("./runner-defaults.js").RunnerLayout} */
export const DEFAULT_RUNNER_LAYOUT = await loadDefaultRunnerLayout();

/**
 * Interpolates a generation directory name from the configured pattern.
 *
 * @param {string} pattern - e.g. "generation-{generation}"
 * @param {number} generation
 * @returns {string}
 */
export function formatGenerationDirName(pattern, generation) {
  return pattern.replace("{generation}", String(generation));
}
