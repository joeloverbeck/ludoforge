const DEFAULT_DRAW_SCORE = 0.5;

function outcomeToScore(outcome) {
  if (outcome === "win") {
    return 1;
  }
  if (outcome === "lose") {
    return 0;
  }
  return DEFAULT_DRAW_SCORE;
}

function computeOutcomeVariance(summaries) {
  const statsByPlayer = new Map();

  for (const summary of summaries) {
    const outcomes = summary?.terminalOutcome?.outcomes;
    if (!outcomes || typeof outcomes !== "object") {
      continue;
    }
    for (const [playerId, outcome] of Object.entries(outcomes)) {
      const score = outcomeToScore(outcome);
      const stats = statsByPlayer.get(playerId) ?? { count: 0, sum: 0, sumSq: 0 };
      stats.count += 1;
      stats.sum += score;
      stats.sumSq += score * score;
      statsByPlayer.set(playerId, stats);
    }
  }

  if (statsByPlayer.size === 0) {
    return 0;
  }

  let totalVariance = 0;
  let playerCount = 0;

  for (const stats of statsByPlayer.values()) {
    if (stats.count <= 0) {
      continue;
    }
    const mean = stats.sum / stats.count;
    const variance = Math.max(0, stats.sumSq / stats.count - mean * mean);
    totalVariance += variance;
    playerCount += 1;
  }

  if (playerCount === 0) {
    return 0;
  }

  return totalVariance / playerCount;
}

export { outcomeToScore, computeOutcomeVariance };
