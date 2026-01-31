export function validateNoLegalActionsPolicy(definition, pushIssue) {
  const noLegalActions = definition.turn?.noLegalActions;
  if (noLegalActions && typeof noLegalActions === "object") {
    const policy = noLegalActions.policy;
    const defaultOutcome = noLegalActions.defaultOutcome;
    if (policy === "terminate") {
      if (!defaultOutcome) {
        pushIssue(
          "/turn/noLegalActions/defaultOutcome",
          "defaultOutcome is required when policy is terminate",
          "no-legal-actions-default-outcome"
        );
      }
    } else if (policy === "pass" || policy === "error") {
      if (defaultOutcome) {
        pushIssue(
          "/turn/noLegalActions/defaultOutcome",
          "defaultOutcome is only valid for terminate policy",
          "no-legal-actions-default-outcome"
        );
      }
    }
  }
}
