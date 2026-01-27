function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function computeLengthMean(summaries) {
  const lengths = summaries
    .map((summary) => safeNumber(summary?.stepCount))
    .filter((value) => Number.isFinite(value));
  return average(lengths);
}

function computeLengthVariance(summaries) {
  const lengths = summaries
    .map((summary) => safeNumber(summary?.stepCount))
    .filter((value) => Number.isFinite(value));
  if (lengths.length === 0) {
    return 0;
  }
  const mean = average(lengths);
  const variance =
    lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lengths.length;
  return variance;
}

function computeEarlyTerminationRate(summaries) {
  if (!summaries.length) {
    return 0;
  }
  let earlyCount = 0;
  for (const summary of summaries) {
    const terminationReason = summary?.terminationReason;
    const terminated = summary?.terminalOutcome?.terminated;
    if (terminated === false) {
      earlyCount += 1;
      continue;
    }
    if (typeof terminationReason === "string" && terminationReason !== "condition") {
      earlyCount += 1;
    }
  }
  return earlyCount / summaries.length;
}

function outcomeToScore(outcome) {
  if (outcome === "win") {
    return 1;
  }
  if (outcome === "lose") {
    return 0;
  }
  return 0.5;
}

function computeBalanceSkew(summaries) {
  const totals = new Map();
  const counts = new Map();

  for (const summary of summaries) {
    const outcomes = summary?.terminalOutcome?.outcomes;
    if (!outcomes || typeof outcomes !== "object") {
      continue;
    }
    for (const [playerId, outcome] of Object.entries(outcomes)) {
      const score = outcomeToScore(outcome);
      totals.set(playerId, safeNumber(totals.get(playerId)) + score);
      counts.set(playerId, safeNumber(counts.get(playerId)) + 1);
    }
  }

  if (totals.size < 2) {
    return 0;
  }

  const winRates = [];
  for (const [playerId, total] of totals.entries()) {
    const count = counts.get(playerId) ?? 0;
    if (count > 0) {
      winRates.push(total / count);
    }
  }

  if (winRates.length < 2) {
    return 0;
  }

  const max = Math.max(...winRates);
  const min = Math.min(...winRates);
  return max - min;
}

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

function computeExtendedMetrics(definition, summaries) {
  return [
    { id: "length_mean", value: computeLengthMean(summaries) },
    { id: "length_variance", value: computeLengthVariance(summaries) },
    { id: "early_termination_rate", value: computeEarlyTerminationRate(summaries) },
    { id: "balance_skew", value: computeBalanceSkew(summaries) },
    { id: "coverage_actions", value: computeCoverageActions(definition, summaries) },
    { id: "coverage_state", value: computeCoverageState(summaries) },
  ];
}

export {
  computeLengthMean,
  computeLengthVariance,
  computeEarlyTerminationRate,
  computeBalanceSkew,
  computeCoverageActions,
  computeCoverageState,
  computeExtendedMetrics,
};
