import { computeSkillExpressionMetric } from "../skill-expression.js";
import { computeCoverageActions, computeCoverageState } from "./coverage-metrics.js";
import {
  computeEarlyTerminationRate,
  computeLengthMean,
  computeLengthVariance,
} from "./length-metrics.js";
import { computeOutcomeVariance } from "./outcome-metrics.js";
import { computeComebackPotential } from "./decision-quality/comeback-potential.js";
import { computeAdvantageReversalRate } from "./decision-quality/advantage-reversal.js";
import { computeMeaningfulChoice } from "./decision-quality/meaningful-choice.js";
import { computePolicySensitivity } from "./policy-sensitivity.js";
import { METRICS_EXTENDED_DEFAULTS } from "./config.js";

function resolveEnabled(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(fallback);
}

function resolveSuiteResults(suiteResults, suiteId) {
  if (!suiteResults || typeof suiteResults !== "object") {
    return null;
  }
  if (typeof suiteId === "string" && suiteId.length > 0) {
    const entry = suiteResults[suiteId];
    return Array.isArray(entry?.results) ? entry.results : null;
  }
  const entries = Object.values(suiteResults);
  if (entries.length === 1 && Array.isArray(entries[0]?.results)) {
    return entries[0].results;
  }
  return null;
}

async function computeExtendedMetrics(definition, summaries, options = {}, suiteResults = null) {
  const metrics = [
    { id: "length_mean", value: computeLengthMean(summaries) },
    { id: "length_variance", value: computeLengthVariance(summaries) },
    { id: "early_termination_rate", value: computeEarlyTerminationRate(summaries) },
    { id: "outcome_variance", value: computeOutcomeVariance(summaries) },
    { id: "coverage_actions", value: computeCoverageActions(definition, summaries) },
    { id: "coverage_state", value: computeCoverageState(summaries) },
  ];

  const meaningfulChoiceEnabled = resolveEnabled(
    options?.meaningfulChoice?.enabled,
    METRICS_EXTENDED_DEFAULTS.meaningfulChoice.enabled
  );
  if (meaningfulChoiceEnabled) {
    const value = await computeMeaningfulChoice(
      definition,
      options.simulations,
      options.meaningfulChoice
    );
    metrics.push({ id: "choice_value_spread", value });
  }

  const comebackEnabled = resolveEnabled(
    options?.comebackPotential?.enabled,
    METRICS_EXTENDED_DEFAULTS.comebackPotential.enabled
  );
  if (comebackEnabled) {
    const value = computeComebackPotential(
      definition,
      options.simulations,
      options.comebackPotential
    );
    metrics.push({ id: "comeback_potential", value });
  }

  const skillExpressionEnabled = resolveEnabled(
    options?.skillExpression?.enabled,
    METRICS_EXTENDED_DEFAULTS.skillExpression.enabled
  );
  if (skillExpressionEnabled) {
    const skillExpressionOptions = {
      ...METRICS_EXTENDED_DEFAULTS.skillExpression,
      ...(options.skillExpression ?? {}),
      enabled: skillExpressionEnabled,
    };
    const value = await computeSkillExpressionMetric(definition, skillExpressionOptions);
    metrics.push({ id: "skill_expression", value });
  }

  const advantageReversalEnabled = resolveEnabled(
    options?.advantageReversal?.enabled,
    METRICS_EXTENDED_DEFAULTS.advantageReversal.enabled
  );
  if (advantageReversalEnabled) {
    const advantageReversalSimulations =
      resolveSuiteResults(suiteResults, options?.advantageReversal?.suiteId) ??
      options.simulations;
    const value = computeAdvantageReversalRate(
      definition,
      advantageReversalSimulations,
      { ...options.advantageReversal, enabled: advantageReversalEnabled }
    );
    metrics.push({ id: "advantage_reversal_rate", value });
  }

  const policySensitivityEnabled = resolveEnabled(
    options?.policySensitivity?.enabled,
    METRICS_EXTENDED_DEFAULTS.policySensitivity.enabled
  );
  if (policySensitivityEnabled) {
    const policySensitivityOptions = {
      ...METRICS_EXTENDED_DEFAULTS.policySensitivity,
      ...(options.policySensitivity ?? {}),
      enabled: policySensitivityEnabled,
      suiteResults: suiteResults ?? options.policySensitivity?.suiteResults,
    };
    const value = await computePolicySensitivity(definition, policySensitivityOptions);
    metrics.push({ id: "policy_sensitivity", value });
  }

  return metrics;
}

export { computeExtendedMetrics };
