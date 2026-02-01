import { normalizeArray } from "./issue-collector.js";

export function validateTerminationBlock(definition, pushIssue) {
  const terminationConditions = normalizeArray(definition.termination?.conditions);
  const maxTurns = definition.termination?.maxTurns;
  if (terminationConditions.length === 0) {
    pushIssue(
      "/termination/conditions",
      "At least one termination condition is required",
      "termination-conditions"
    );
  }
  if (typeof maxTurns !== "number") {
    pushIssue("/termination/maxTurns", "A maxTurns fallback is required", "termination-max-turns");
  }
  return terminationConditions;
}

export function validateTerminationExpressions(terminationConditions, definition, validateExpr) {
  terminationConditions.forEach((termination, index) => {
    if (termination?.condition) {
      validateExpr(termination.condition, `/termination/conditions/${index}/condition`);
    }
  });

  if (definition.termination?.scoring?.perPlayer) {
    validateExpr(definition.termination.scoring.perPlayer, "/termination/scoring/perPlayer");
  }
}

/**
 * Validate that termination thresholds are within referenced variable bounds.
 * @param {Array} terminationConditions
 * @param {Map<string, object>} variableById
 * @param {Function} pushIssue
 */
export function validateTerminationThresholds(terminationConditions, variableById, pushIssue) {
  terminationConditions.forEach((entry, index) => {
    if (!entry?.condition || entry.condition.kind !== "cmp") {
      return;
    }
    const cond = entry.condition;
    const varId =
      cond.left?.kind === "ref" && cond.left.ref?.kind === "var" && typeof cond.left.ref.id === "string"
        ? cond.left.ref.id
        : null;
    if (!varId) {
      return;
    }
    const variable = variableById.get(varId);
    if (
      !variable ||
      variable.type?.kind !== "int" ||
      typeof variable.type.min !== "number" ||
      typeof variable.type.max !== "number"
    ) {
      return;
    }
    const { min, max } = variable.type;
    if (cond.right?.kind !== "value" || typeof cond.right.value !== "number") {
      return;
    }
    const threshold = cond.right.value;
    const basePath = `/termination/conditions/${index}/condition`;

    if (threshold < min || threshold > max) {
      pushIssue(
        basePath,
        `Termination threshold ${threshold} is outside variable "${varId}" bounds [${min}, ${max}]`,
        "termination-threshold-out-of-bounds"
      );
    }

    const initial = typeof variable.initial === "number" ? variable.initial : min;
    const op = cond.op;
    const immediatelyTrue =
      (op === ">=" && initial >= threshold) ||
      (op === "<=" && initial <= threshold) ||
      (op === ">" && initial > threshold) ||
      (op === "<" && initial < threshold) ||
      (op === "==" && initial === threshold);
    if (immediatelyTrue) {
      pushIssue(
        basePath,
        `Termination condition is immediately true at initial state (variable "${varId}" initial=${initial}, threshold ${op} ${threshold})`,
        "termination-immediately-true"
      );
    }
  });
}
