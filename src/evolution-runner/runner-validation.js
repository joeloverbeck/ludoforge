export function assertNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

export function assertPopulation(population) {
  assertNonEmptyArray(population, "Population");
  population.forEach((genome, index) => {
    if (!genome || typeof genome !== "object") {
      throw new Error(`Population entry ${index} must be an object`);
    }
    if (typeof genome.id !== "string" || genome.id.trim().length === 0) {
      throw new Error(`Population entry ${index} must include a non-empty id`);
    }
    if (!genome.definition || typeof genome.definition !== "object") {
      throw new Error(`Population entry ${index} must include a definition object`);
    }
  });
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function canBuildWeightedSelector(operators, weights) {
  if (!Array.isArray(operators) || operators.length === 0) {
    return false;
  }
  if (!isPlainObject(weights)) {
    return false;
  }
  return operators.every((operator) => {
    const weight = weights[operator?.name];
    return Number.isFinite(weight) && weight > 0;
  });
}

export function ensureTelemetryOperators(telemetry, operatorNames) {
  if (!telemetry || !isPlainObject(telemetry.operators)) {
    throw new Error("Operator telemetry is missing operator counters");
  }
  operatorNames.forEach((name) => {
    if (!telemetry.operators[name]) {
      throw new Error(`Operator telemetry missing operator: ${name}`);
    }
  });
}
