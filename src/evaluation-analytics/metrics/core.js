const DEFAULT_DRAW_SCORE = 0.5;

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

function computeAgency(summaries) {
  let choiceSteps = 0;
  let totalSteps = 0;

  for (const summary of summaries) {
    const steps = summary.keySteps ?? [];
    for (const step of steps) {
      if (typeof step.legalActionCount === "number") {
        totalSteps += 1;
        if (step.legalActionCount > 1) {
          choiceSteps += 1;
        }
      }
    }
  }

  if (totalSteps === 0) {
    return 0;
  }

  return choiceSteps / totalSteps;
}

function computeStrategicDepth(summaries) {
  const branching = [];

  for (const summary of summaries) {
    const steps = summary.keySteps ?? [];
    for (const step of steps) {
      if (typeof step.legalActionCount === "number") {
        branching.push(step.legalActionCount);
      }
    }
  }

  return average(branching);
}

function outcomeToScore(outcome) {
  if (outcome === "win") {
    return 1;
  }
  if (outcome === "lose") {
    return 0;
  }
  return DEFAULT_DRAW_SCORE;
}

function computeSkillExpression(summaries) {
  const totals = new Map();
  const counts = new Map();

  for (const summary of summaries) {
    const outcomes = summary.terminalOutcome?.outcomes;
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

function computeEntropy(actionCounts, stepCount) {
  if (!actionCounts || stepCount <= 0) {
    return 0;
  }
  const counts = Object.values(actionCounts).filter((count) => count > 0);
  const variety = counts.length;
  if (variety <= 1) {
    return 0;
  }
  const entropy = counts.reduce((sum, count) => {
    const probability = count / stepCount;
    return sum - probability * Math.log(probability);
  }, 0);
  return entropy / Math.log(variety);
}

function computeVariety(summaries) {
  const entropies = [];

  for (const summary of summaries) {
    if (!summary.actionCounts || typeof summary.stepCount !== "number") {
      continue;
    }
    entropies.push(computeEntropy(summary.actionCounts, summary.stepCount));
  }

  return average(entropies);
}

function computePacingTension(summaries) {
  const pacingValues = [];

  for (const summary of summaries) {
    const steps = safeNumber(summary.stepCount);
    const turns = safeNumber(summary.turnCount);
    if (turns > 0) {
      pacingValues.push(steps / turns);
    }
  }

  return average(pacingValues);
}

function computeTurnTakingRate(summaries) {
  const rates = [];

  for (const summary of summaries) {
    const steps = summary.keySteps ?? [];
    if (steps.length <= 1) {
      continue;
    }
    let transitions = 0;
    let possible = 0;
    let previousPlayer = null;

    for (const step of steps) {
      if (step.playerId == null) {
        continue;
      }
      if (previousPlayer != null) {
        possible += 1;
        if (step.playerId !== previousPlayer) {
          transitions += 1;
        }
      }
      previousPlayer = step.playerId;
    }

    if (possible > 0) {
      rates.push(transitions / possible);
    }
  }

  return average(rates);
}

function computeInteractionRate(summaries) {
  const rates = [];

  for (const summary of summaries) {
    const steps = summary.keySteps ?? [];
    let actionSteps = 0;
    let interactiveSteps = 0;

    for (const step of steps) {
      if (step?.actionId == null) {
        continue;
      }
      actionSteps += 1;
      const affectedPlayerIds = Array.isArray(step.affectedPlayerIds)
        ? step.affectedPlayerIds
        : [];
      const activePlayerId = step?.playerId;
      const affectsOtherPlayer = affectedPlayerIds.some(
        (playerId) => playerId !== activePlayerId
      );
      const affectsGlobal = step.affectedGlobal === true;
      if (affectsOtherPlayer || affectsGlobal) {
        interactiveSteps += 1;
      }
    }

    if (actionSteps > 0) {
      rates.push(interactiveSteps / actionSteps);
    }
  }

  return average(rates);
}

function computeSkippedTriggerRate(summaries) {
  let allSkipped = 0;
  let allAttempted = 0;
  for (const s of summaries) {
    allSkipped += s.totalSkippedTriggers ?? 0;
    allAttempted += s.totalAttemptedTriggers ?? 0;
  }
  return allSkipped / Math.max(1, allAttempted);
}

function computeCostAbortRate(summaries) {
  let allCostAborts = 0;
  let allActionSteps = 0;
  for (const s of summaries) {
    allCostAborts += s.totalCostAborts ?? 0;
    allActionSteps += s.totalActionSteps ?? 0;
  }
  return allCostAborts / Math.max(1, allActionSteps);
}

function computePassStepRate(summaries) {
  let allPassSteps = 0;
  let allSteps = 0;
  for (const s of summaries) {
    allPassSteps += s.totalPassSteps ?? 0;
    allSteps += s.stepCount ?? 0;
  }
  return allPassSteps / Math.max(1, allSteps);
}

function computeNoLegalActionsTerminationRate(summaries) {
  let count = 0;
  for (const s of summaries) {
    if (s.terminationReason === "no-legal-actions") {
      count += 1;
    }
  }
  return count / Math.max(1, summaries.length);
}

function computeCoreMetrics(summaries) {
  return [
    { id: "agency", value: computeAgency(summaries) },
    { id: "strategic_depth", value: computeStrategicDepth(summaries) },
    { id: "seat_imbalance", value: computeSkillExpression(summaries) },
    { id: "variety", value: computeVariety(summaries) },
    { id: "pacing_tension", value: computePacingTension(summaries) },
    { id: "turn_taking_rate", value: computeTurnTakingRate(summaries) },
    { id: "interaction_rate", value: computeInteractionRate(summaries) },
    { id: "skipped_trigger_rate", value: computeSkippedTriggerRate(summaries) },
    { id: "cost_abort_rate", value: computeCostAbortRate(summaries) },
    { id: "pass_step_rate", value: computePassStepRate(summaries) },
    { id: "no_legal_actions_termination_rate", value: computeNoLegalActionsTerminationRate(summaries) },
  ];
}

export {
  computeAgency,
  computeStrategicDepth,
  computeSkillExpression,
  computeVariety,
  computePacingTension,
  computeTurnTakingRate,
  computeInteractionRate,
  computeSkippedTriggerRate,
  computeCostAbortRate,
  computePassStepRate,
  computeNoLegalActionsTerminationRate,
  computeCoreMetrics,
};
