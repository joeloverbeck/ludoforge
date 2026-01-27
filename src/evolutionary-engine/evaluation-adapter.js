import { validateGenomeDefinition } from "./serialization.js";

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

export function evaluateGenome(genome, options) {
  if (!options || typeof options.evaluator !== "function") {
    throw new Error("Evaluation adapter requires an evaluator function");
  }

  const validation = validateGenomeDefinition(genome.definition);
  const diagnostics = {
    validation,
    safety: [],
  };

  if (!validation.valid) {
    return { fitness: null, descriptors: null, diagnostics };
  }

  const safetyFailures = runSafetyGates(genome, options.gates);
  if (safetyFailures.length > 0) {
    return {
      fitness: null,
      descriptors: null,
      diagnostics: {
        ...diagnostics,
        safety: safetyFailures,
      },
    };
  }

  const evaluation = options.evaluator(genome);
  if (!evaluation || evaluation.fitness === undefined || evaluation.descriptors == null) {
    return {
      fitness: null,
      descriptors: null,
      diagnostics: {
        ...diagnostics,
        evaluation: { error: "invalid-evaluator-output" },
      },
    };
  }

  return {
    fitness: evaluation.fitness,
    descriptors: evaluation.descriptors,
    diagnostics: {
      ...diagnostics,
      evaluation: evaluation.diagnostics ?? {},
    },
  };
}
