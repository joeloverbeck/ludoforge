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
      if (affectedPlayerIds.some((playerId) => playerId !== activePlayerId)) {
        interactiveSteps += 1;
      }
    }

    if (actionSteps > 0) {
      rates.push(interactiveSteps / actionSteps);
    }
  }

  return average(rates);
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
  computeCoreMetrics,
};
