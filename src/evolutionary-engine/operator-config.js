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

async function loadDefaultEvolutionOperatorsConfig() {
  const result = await loadConfigFile({ name: "evolution-operators" });
  if (!result.valid) {
    throw new Error(
      `Evolution operators config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

export const DEFAULT_EVOLUTION_OPERATORS_CONFIG = await loadDefaultEvolutionOperatorsConfig();

export function filterOperatorsByEnabled(allOperators, enabledNames) {
  if (!Array.isArray(enabledNames) || enabledNames.length === 0) {
    return allOperators;
  }
  const enabledSet = new Set(enabledNames);
  return allOperators.filter((operator) => enabledSet.has(operator.name));
}
