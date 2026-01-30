function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertOperatorName(operatorName) {
  if (typeof operatorName !== "string" || operatorName.trim().length === 0) {
    throw new Error("operatorName must be a non-empty string");
  }
}

function createOperatorCounters() {
  return {
    attempts: 0,
    validOffspring: 0,
    acceptedOffspring: 0,
    gridContributions: {
      filledEmpty: 0,
      improvedElite: 0,
    },
    noOp: 0,
    repairFailed: 0,
    rejected: {
      validationFailure: 0,
      safetyFailure: 0,
      evaluationError: 0,
      evaluationNull: 0,
    },
    evaluated: 0,
    validEvaluated: 0,
  };
}

const REJECTED_REASONS = new Set([
  "validationFailure",
  "safetyFailure",
  "evaluationError",
  "evaluationNull",
]);

function normalizeOperatorList(operatorNames) {
  if (!Array.isArray(operatorNames) || operatorNames.length === 0) {
    throw new Error("operatorNames must be a non-empty array");
  }
  operatorNames.forEach((name) => assertOperatorName(name));
  return Array.from(new Set(operatorNames));
}

function resolveOperator(telemetry, operatorName) {
  assertOperatorName(operatorName);
  if (!isPlainObject(telemetry)) {
    throw new Error("telemetry must be an object");
  }
  if (!isPlainObject(telemetry.operators)) {
    throw new Error("telemetry.operators must be an object");
  }
  const entry = telemetry.operators[operatorName];
  if (!entry) {
    throw new Error(`Unknown operator: ${operatorName}`);
  }
  return entry;
}

export function createTelemetry(operatorNames) {
  const names = normalizeOperatorList(operatorNames);
  const operators = {};
  names.forEach((name) => {
    operators[name] = createOperatorCounters();
  });
  return { operators };
}

export function recordAttempt(telemetry, operatorName) {
  const entry = resolveOperator(telemetry, operatorName);
  entry.attempts += 1;
}

export function recordOutcome(telemetry, operatorName, outcome = {}) {
  const entry = resolveOperator(telemetry, operatorName);
  const valid = outcome.valid === true;
  const accepted = outcome.accepted === true;

  if (accepted && !valid) {
    throw new Error("Accepted offspring must be valid");
  }

  if (valid) {
    entry.validOffspring += 1;
  }
  if (accepted) {
    entry.acceptedOffspring += 1;
  }

  const contribution = outcome.gridContribution;
  if (contribution === "filledEmpty") {
    entry.gridContributions.filledEmpty += 1;
  } else if (contribution === "improvedElite") {
    entry.gridContributions.improvedElite += 1;
  }
}

export function recordNoOp(telemetry, operatorName) {
  const entry = resolveOperator(telemetry, operatorName);
  entry.noOp += 1;
}

export function recordRepairFailed(telemetry, operatorName) {
  const entry = resolveOperator(telemetry, operatorName);
  entry.repairFailed += 1;
}

export function recordRejection(telemetry, operatorName, reason) {
  if (!REJECTED_REASONS.has(reason)) {
    throw new Error(
      `Invalid rejection reason: ${reason}. Must be one of: ${[...REJECTED_REASONS].join(", ")}`,
    );
  }
  const entry = resolveOperator(telemetry, operatorName);
  entry.rejected[reason] += 1;
}

export function recordEvaluated(telemetry, operatorName) {
  const entry = resolveOperator(telemetry, operatorName);
  entry.evaluated += 1;
}

export function recordValidEvaluated(telemetry, operatorName) {
  const entry = resolveOperator(telemetry, operatorName);
  entry.validEvaluated += 1;
}

export function mergeTelemetry(a, b) {
  if (!isPlainObject(a) || !isPlainObject(b)) {
    throw new Error("telemetry inputs must be objects");
  }
  if (!isPlainObject(a.operators) || !isPlainObject(b.operators)) {
    throw new Error("telemetry.operators must be objects");
  }

  const merged = { operators: {} };
  const names = new Set([...Object.keys(a.operators), ...Object.keys(b.operators)]);

  for (const name of names) {
    const left = a.operators[name];
    const right = b.operators[name];
    if (!left || !right) {
      throw new Error(`Telemetry operator set mismatch for ${name}`);
    }
    merged.operators[name] = {
      attempts: left.attempts + right.attempts,
      validOffspring: left.validOffspring + right.validOffspring,
      acceptedOffspring: left.acceptedOffspring + right.acceptedOffspring,
      gridContributions: {
        filledEmpty: left.gridContributions.filledEmpty + right.gridContributions.filledEmpty,
        improvedElite: left.gridContributions.improvedElite + right.gridContributions.improvedElite,
      },
      noOp: left.noOp + right.noOp,
      repairFailed: left.repairFailed + right.repairFailed,
      rejected: {
        validationFailure: left.rejected.validationFailure + right.rejected.validationFailure,
        safetyFailure: left.rejected.safetyFailure + right.rejected.safetyFailure,
        evaluationError: left.rejected.evaluationError + right.rejected.evaluationError,
        evaluationNull: left.rejected.evaluationNull + right.rejected.evaluationNull,
      },
      evaluated: left.evaluated + right.evaluated,
      validEvaluated: left.validEvaluated + right.validEvaluated,
    };
  }

  return merged;
}

export function serializeTelemetry(telemetry) {
  if (!isPlainObject(telemetry)) {
    throw new Error("telemetry must be an object");
  }
  return structuredClone(telemetry);
}
