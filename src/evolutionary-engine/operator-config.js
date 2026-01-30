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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertMutationWeights(config) {
  const mutation = config?.mutation;
  const enabled = Array.isArray(mutation?.enabled) ? mutation.enabled : [];
  const weights = mutation?.weights;

  if (!isPlainObject(weights)) {
    throw new Error("mutation.weights must be an object");
  }

  const errors = [];

  enabled.forEach((name) => {
    if (!(name in weights)) {
      errors.push(`mutation.weights.${name}: missing weight for enabled operator`);
      return;
    }
    const weight = weights[name];
    if (!Number.isFinite(weight)) {
      errors.push(`mutation.weights.${name}: weight must be finite`);
      return;
    }
    if (weight <= 0) {
      errors.push(`mutation.weights.${name}: weight must be greater than 0`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Evolution operators weight validation failed:\n${errors.join("\n")}`);
  }
}

async function loadDefaultEvolutionOperatorsConfig() {
  const result = await loadConfigFile({ name: "evolution-operators" });
  if (!result.valid) {
    throw new Error(
      `Evolution operators config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  const config = result.config ?? {};
  assertMutationWeights(config);
  return config;
}

export const DEFAULT_EVOLUTION_OPERATORS_CONFIG = await loadDefaultEvolutionOperatorsConfig();

export function filterOperatorsByEnabled(allOperators, enabledNames) {
  if (!Array.isArray(enabledNames) || enabledNames.length === 0) {
    return allOperators;
  }
  const enabledSet = new Set(enabledNames);
  return allOperators.filter((operator) => enabledSet.has(operator.name));
}
