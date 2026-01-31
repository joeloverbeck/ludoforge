import { normalizeArray } from "./issue-collector.js";
import {
  reportAggregateActionIssues,
  reportFreeLunchIssue,
  summarizeAction,
} from "./action-analysis.js";

export function validateActions(
  definition,
  { validateExpr, validateEffect, validateSelector, evaluateExpr, exprEvalContext, pushIssue }
) {
  const actions = normalizeArray(definition.actions);
  const actionSummaries = [];
  actions.forEach((action, index) => {
    const costs = normalizeArray(action?.costs);
    const effects = normalizeArray(action?.effects);
    const targets = normalizeArray(action?.params);
    const preconditionEvaluation = action?.preconditions
      ? evaluateExpr(action.preconditions, exprEvalContext)
      : { possible: true, alwaysTrue: true };
    if (action?.preconditions) {
      validateExpr(action.preconditions, `/actions/${index}/preconditions`);
      if (preconditionEvaluation.possible === false) {
        pushIssue(
          `/actions/${index}/preconditions`,
          "Action preconditions are unsatisfiable given declared bounds",
          "action-precondition-unsatisfiable"
        );
      }
    }
    const actionBindingIds = new Set(
      targets.map((t) => t?.id).filter((id) => typeof id === "string")
    );
    const effectOptions = actionBindingIds.size > 0 ? { actionBindingIds } : {};
    costs.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/costs/${effectIndex}`, effectOptions);
    });
    effects.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/effects/${effectIndex}`, effectOptions);
    });
    targets.forEach((target, targetIndex) => {
      validateSelector(target?.domain?.selector, `/actions/${index}/params/${targetIndex}/selector`);
    });

    const summary = summarizeAction({
      action,
      costs,
      effects,
      targets,
      preconditionEvaluation,
    });
    reportFreeLunchIssue({ actionIndex: index, summary, pushIssue });
    actionSummaries.push({ index, ...summary });
  });

  reportAggregateActionIssues({ actions, actionSummaries, pushIssue });
  return actionSummaries;
}
