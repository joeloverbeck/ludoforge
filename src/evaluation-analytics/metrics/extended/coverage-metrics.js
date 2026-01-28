import { average, safeNumber } from "./math-utils.js";

function computeCoverageActions(definition, summaries) {
  const actionCount = Array.isArray(definition?.actions) ? definition.actions.length : 0;
  if (actionCount <= 0) {
    return 0;
  }
  const observed = new Set();
  for (const summary of summaries) {
    const actionCounts = summary?.actionCounts;
    if (actionCounts && typeof actionCounts === "object") {
      for (const actionId of Object.keys(actionCounts)) {
        if (typeof actionId === "string" && actionId.length > 0) {
          observed.add(actionId);
        }
      }
    }
    const steps = summary?.keySteps ?? [];
    for (const step of steps) {
      if (typeof step?.actionId === "string" && step.actionId.length > 0) {
        observed.add(step.actionId);
      }
    }
  }
  return Math.min(1, observed.size / actionCount);
}

function computeCoverageState(summaries) {
  const ratios = [];
  for (const summary of summaries) {
    const stepCount = safeNumber(summary?.stepCount);
    const uniqueStateCount = safeNumber(summary?.uniqueStateCount);
    if (stepCount > 0 && Number.isFinite(uniqueStateCount)) {
      ratios.push(Math.min(1, uniqueStateCount / stepCount));
    }
  }
  return average(ratios);
}

export { computeCoverageActions, computeCoverageState };
