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
