import { validateGenomeDefinition } from "./serialization.js";
import { repairGenome } from "./repair.js";

function collectRepairNames(operators) {
  return operators.map((operator) => operator?.name ?? "unnamed-repair");
}

function normalizeSafetyFailure(gate, result) {
  const name = gate?.name ?? "unnamed-gate";
  if (result === false) {
    return { name, reason: "failed" };
  }
  if (!result || typeof result !== "object") {
    return { name, reason: "invalid-result" };
  }
  if (result.ok) {
    return null;
  }
  return {
    name,
    reason: result.reason ?? "failed",
    details: result.details,
  };
}

function runSafetyGates(genome, gates) {
  const failures = [];
  const list = Array.isArray(gates) ? gates : [];
  for (const gate of list) {
    if (!gate || typeof gate.check !== "function") {
      throw new Error("Invalid safety gate");
    }
    const failure = normalizeSafetyFailure(gate, gate.check(genome));
    if (failure) {
      failures.push(failure);
    }
  }
  return failures;
}

export async function evaluateGenome(genome, options) {
  if (!options || typeof options.evaluator !== "function") {
    throw new Error("Evaluation adapter requires an evaluator function");
  }

  const operators = Array.isArray(options.repairOperators) ? options.repairOperators : null;
  const repairDiagnostics =
    operators && operators.length > 0
      ? {
          applied: collectRepairNames(operators),
          failed: false,
        }
      : null;
  const repaired = operators && operators.length > 0 ? repairGenome(genome, { operators, rng: options.repairRng }) : genome;

  if (!repaired && repairDiagnostics) {
    repairDiagnostics.failed = true;
    const validation = validateGenomeDefinition(genome.definition);
    const diagnostics = {
      validation,
      safety: [],
      repair: repairDiagnostics,
    };
    return { fitness: null, descriptors: null, diagnostics };
  }

  const candidate = repaired ?? genome;
  const validation = validateGenomeDefinition(candidate.definition);
  const diagnostics = {
    validation,
    safety: [],
    ...(repairDiagnostics ? { repair: repairDiagnostics } : {}),
  };

  if (!validation.valid) {
    return {
      fitness: null,
      descriptors: null,
      diagnostics,
      ...(repairDiagnostics ? { genome: candidate } : {}),
    };
  }

  const safetyFailures = runSafetyGates(candidate, options.gates);
  if (safetyFailures.length > 0) {
    return {
      fitness: null,
      descriptors: null,
      diagnostics: {
        ...diagnostics,
        safety: safetyFailures,
      },
      ...(repairDiagnostics ? { genome: candidate } : {}),
    };
  }

  const evaluation = await options.evaluator(candidate);
  if (!evaluation || evaluation.fitness === undefined || evaluation.descriptors == null) {
    return {
      fitness: null,
      descriptors: null,
      diagnostics: {
        ...diagnostics,
        evaluation: {
          error: "invalid-evaluator-output",
          returnedFitness: evaluation?.fitness,
          returnedDescriptors: evaluation?.descriptors != null,
        },
      },
      ...(repairDiagnostics ? { genome: candidate } : {}),
    };
  }

  return {
    fitness: evaluation.fitness,
    descriptors: evaluation.descriptors,
    diagnostics: {
      ...diagnostics,
      evaluation: evaluation.diagnostics ?? {},
    },
    ...(repairDiagnostics ? { genome: candidate } : {}),
  };
}
