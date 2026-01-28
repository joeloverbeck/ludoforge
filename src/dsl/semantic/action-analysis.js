export function summarizeAction({
  action,
  costs,
  effects,
  targets,
  preconditionEvaluation,
}) {
  const hasBeneficialEffects = effects.some((effect) => {
    if (!effect || typeof effect !== "object") {
      return false;
    }
    if (effect.kind === "inc") {
      return typeof effect.amount !== "number" || effect.amount > 0;
    }
    if (effect.kind === "spawn") {
      return true;
    }
    return false;
  });

  return {
    possible: preconditionEvaluation.possible !== false,
    alwaysAvailable: Boolean(!action?.preconditions || preconditionEvaluation.alwaysTrue),
    hasBeneficialEffects,
    hasCosts: costs.length > 0,
    hasLimits: Boolean(action?.preconditions) || targets.length > 0,
  };
}

export function reportFreeLunchIssue({ actionIndex, summary, pushIssue }) {
  if (summary.hasBeneficialEffects && !summary.hasCosts && !summary.hasLimits) {
    pushIssue(
      `/actions/${actionIndex}`,
      "Beneficial action effects must include costs or limits (preconditions/targets)",
      "free-lunch"
    );
  }
}

export function reportAggregateActionIssues({ actions, actionSummaries, pushIssue }) {
  const possibleActions = actionSummaries.filter((action) => action.possible);
  if (actions.length === 0 || possibleActions.length === 0) {
    pushIssue(
      "/actions",
      "No meaningful actions are available in typical states given declared bounds",
      "no-meaningful-actions"
    );
  }

  if (actions.length > 1) {
    actionSummaries.forEach((action) => {
      if (
        action.possible &&
        action.alwaysAvailable &&
        action.hasBeneficialEffects &&
        !action.hasCosts &&
        !action.hasLimits
      ) {
        pushIssue(
          `/actions/${action.index}`,
          "Action is always available and strictly beneficial without costs or limits; likely dominant",
          "dominant-action"
        );
      }
    });
  }
}
