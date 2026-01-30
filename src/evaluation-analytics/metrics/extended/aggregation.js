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

function computeExtendedMetrics(definition, summaries, options = {}) {
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
    const value = computeMeaningfulChoice(
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
    const value = computeSkillExpressionMetric(definition, skillExpressionOptions);
    metrics.push({ id: "skill_expression", value });
  }

  const advantageReversalEnabled = resolveEnabled(
    options?.advantageReversal?.enabled,
    METRICS_EXTENDED_DEFAULTS.advantageReversal.enabled
  );
  if (advantageReversalEnabled) {
    const value = computeAdvantageReversalRate(
      definition,
      options.simulations,
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
    };
    const value = computePolicySensitivity(definition, policySensitivityOptions);
    metrics.push({ id: "policy_sensitivity", value });
  }

  return metrics;
}

export { computeExtendedMetrics };
