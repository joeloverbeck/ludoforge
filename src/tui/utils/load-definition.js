/**
 * Load and validate a game definition JSON file.
 *
 * Reads the file, parses JSON, and validates against the DSL schema
 * using the existing `validateGameDefinition` from `src/dsl/validate.js`.
 *
 * @module tui/utils/load-definition
 */

import { readFile } from "node:fs/promises";
import { validateGameDefinition } from "../../dsl/validate.js";

/**
 * Load a game definition from a JSON file path.
 *
 * @param {string} filePath - absolute or relative path to a JSON file
 * @returns {Promise<object>} the validated GameDefinition object
 * @throws {Error} if the file is missing, contains invalid JSON, or fails schema validation
 */
export async function loadDefinition(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new Error("filePath must be a non-empty string");
  }

  /** @type {string} */
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read game definition file: ${err.message}`);
  }

  /** @type {object} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
  }

  const result = validateGameDefinition(parsed);
  if (!result.valid) {
    const messages = result.errors.map((e) => `  ${e.path}: ${e.message}`).join("\n");
    throw new Error(`Schema validation failed for ${filePath}:\n${messages}`);
  }

  return parsed;
}
