/**
 * Computes population health metrics for a single generation.
 *
 * @param {object} options
 * @param {Array<{fitness: number, diagnostics?: object}>} options.evaluated
 * @param {Array<{reason?: string}>} options.rejected
 * @param {{elites: Map<string, object>}} options.mapElites
 * @param {{operators: Record<string, {attempts: number, validEvaluated: number, repairFailed: number, noOp: number}>}} options.telemetry
 * @returns {object} Health metrics object safe for JSON serialization
 */
export function computeHealthMetrics({ evaluated, rejected, mapElites, telemetry }) {
  const fitnessValues = [];
  for (const entry of evaluated) {
    if (typeof entry.fitness === "number" && Number.isFinite(entry.fitness)) {
      fitnessValues.push(entry.fitness);
    }
  }

  const meanFitness = fitnessValues.length > 0
    ? fitnessValues.reduce((sum, v) => sum + v, 0) / fitnessValues.length
    : 0;

  const medianFitness = computeMedian(fitnessValues);

  const totalEvaluated = evaluated.length + rejected.length;
  const rejectionRate = totalEvaluated > 0
    ? rejected.length / totalEvaluated
    : 0;

  const rejectionReasons = {};
  for (const entry of rejected) {
    const reason = entry.reason ?? "unknown";
    rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1;
  }

  const degeneracyFlags = {};
  for (const entry of evaluated) {
    const flags = entry.diagnostics?.evaluation?.degeneracy?.flags;
    if (Array.isArray(flags)) {
      for (const flag of flags) {
        degeneracyFlags[flag] = (degeneracyFlags[flag] ?? 0) + 1;
      }
    }
  }

  const nicheOccupancy = mapElites && mapElites.elites instanceof Map
    ? mapElites.elites.size
    : 0;

  const operatorRates = computeOperatorRates(telemetry);

  return {
    meanFitness: sanitizeNumber(meanFitness),
    medianFitness: sanitizeNumber(medianFitness),
    rejectionRate: sanitizeNumber(rejectionRate),
    rejectionReasons,
    degeneracyFlags,
    nicheOccupancy,
    operatorInefficiencyRate: sanitizeNumber(operatorRates.operatorInefficiencyRate),
    repairFailureRate: sanitizeNumber(operatorRates.repairFailureRate),
    noOpRate: sanitizeNumber(operatorRates.noOpRate),
  };
}

function computeMedian(values) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function computeOperatorRates(telemetry) {
  const zero = { operatorInefficiencyRate: 0, repairFailureRate: 0, noOpRate: 0 };
  if (!telemetry || typeof telemetry !== "object" || !telemetry.operators) {
    return zero;
  }
  let totalAttempts = 0;
  let totalValidEvaluated = 0;
  let totalRepairFailed = 0;
  let totalNoOp = 0;
  for (const entry of Object.values(telemetry.operators)) {
    if (!entry || typeof entry.attempts !== "number") {
      continue;
    }
    totalAttempts += entry.attempts;
    if (typeof entry.validEvaluated === "number") {
      totalValidEvaluated += entry.validEvaluated;
    }
    if (typeof entry.repairFailed === "number") {
      totalRepairFailed += entry.repairFailed;
    }
    if (typeof entry.noOp === "number") {
      totalNoOp += entry.noOp;
    }
  }
  if (totalAttempts === 0) {
    return zero;
  }
  return {
    operatorInefficiencyRate: (totalAttempts - totalValidEvaluated) / totalAttempts,
    repairFailureRate: totalRepairFailed / totalAttempts,
    noOpRate: totalNoOp / totalAttempts,
  };
}

function sanitizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}
