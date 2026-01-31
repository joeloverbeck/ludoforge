function formatDetail(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

function checkFlags(stats, resolvedThresholds, summaryCount) {
  const flags = new Set();
  const details = {};
  const ratios = {};

  const {
    loopDetectedCount,
    loopRepeatSamples,
    maxRepeatRatio,
    maxRepeatedStates,
    maxLoopSteps,
    stalemateCount,
    nonTerminatingCount,
    maxTurnsCount,
    maxStepsCount,
    forcedSamples,
    forcedSteps,
    actionTotals,
    totalActions,
    skippedEffectsTotal,
    appliedEffectsTotal,
    winCounts,
    winSamples,
    winStepTotal,
    winStepSamples,
  } = stats;

  const {
    loopRepeatRatio,
    minRepeatedStates,
    forcedMoveRatio,
    dominantActionRatio,
    minActionSamples,
    trivialWinRate,
    trivialWinMaxAverageSteps,
    minTrivialWinSamples,
    minStepsForNoChoices,
    highSkippedEffectsRate,
    highSkippedEffectsMinAttempts,
  } = resolvedThresholds;

  if (loopDetectedCount > 0 || (maxRepeatRatio >= loopRepeatRatio && maxRepeatedStates >= minRepeatedStates)) {
    flags.add("loop");
    details.loop = formatDetail({
      repeat_ratio: maxRepeatRatio,
      threshold: loopRepeatRatio,
      repeated_states: maxRepeatedStates,
      steps: maxLoopSteps,
      loop_detected: loopDetectedCount,
      samples: loopRepeatSamples,
    });
  }

  if (stalemateCount > 0) {
    flags.add("stalemate");
    details.stalemate = formatDetail({
      count: stalemateCount,
      samples: summaryCount,
    });
  }

  if (nonTerminatingCount > 0) {
    flags.add("non-terminating");
    details["non-terminating"] = formatDetail({
      count: nonTerminatingCount,
      max_turns: maxTurnsCount,
      max_steps: maxStepsCount,
      loop_detected: loopDetectedCount,
      samples: summaryCount,
    });
  }

  if (forcedSamples > 0) {
    const ratio = forcedSteps / forcedSamples;
    ratios["forced-move"] = ratio;
    if (ratio >= forcedMoveRatio) {
      flags.add("forced-move");
      details["forced-move"] = formatDetail({
        forced_ratio: ratio,
        threshold: forcedMoveRatio,
        forced_steps: forcedSteps,
        samples: forcedSamples,
      });
    }
    if (forcedSteps === forcedSamples && forcedSamples >= minStepsForNoChoices) {
      flags.add("no-choices");
      details["no-choices"] = formatDetail({
        forced_steps: forcedSteps,
        samples: forcedSamples,
      });
    }
  }

  if (totalActions >= minActionSamples && actionTotals.size > 0) {
    let topActionId = null;
    let topCount = 0;
    for (const [actionId, count] of actionTotals.entries()) {
      if (count > topCount) {
        topCount = count;
        topActionId = actionId;
      }
    }
    const ratio = totalActions > 0 ? topCount / totalActions : 0;
    if (ratio >= dominantActionRatio && topActionId) {
      flags.add("dominant-action");
      details["dominant-action"] = formatDetail({
        action: topActionId,
        dominant_ratio: ratio,
        threshold: dominantActionRatio,
        top_count: topCount,
        total_actions: totalActions,
      });
    }
  }

  if (winSamples >= minTrivialWinSamples && winCounts.size > 0) {
    let topWinner = null;
    let topWinCount = 0;
    for (const [playerId, count] of winCounts.entries()) {
      if (count > topWinCount) {
        topWinCount = count;
        topWinner = playerId;
      }
    }
    const winRatio = winSamples > 0 ? topWinCount / winSamples : 0;
    const averageSteps = winStepSamples > 0 ? winStepTotal / winStepSamples : 0;
    if (winRatio >= trivialWinRate && averageSteps <= trivialWinMaxAverageSteps && topWinner) {
      flags.add("trivial-win");
      details["trivial-win"] = formatDetail({
        winner: topWinner,
        win_ratio: winRatio,
        threshold: trivialWinRate,
        avg_steps: averageSteps,
        max_avg_steps: trivialWinMaxAverageSteps,
        samples: winSamples,
      });
    }
  }

  const effectAttempts = skippedEffectsTotal + appliedEffectsTotal;
  if (effectAttempts >= highSkippedEffectsMinAttempts && effectAttempts > 0) {
    const skipRate = skippedEffectsTotal / effectAttempts;
    ratios["high-skipped-effects"] = skipRate;
    if (skipRate >= highSkippedEffectsRate) {
      flags.add("high-skipped-effects");
      details["high-skipped-effects"] = formatDetail({
        skip_rate: skipRate,
        threshold: highSkippedEffectsRate,
        skipped: skippedEffectsTotal,
        applied: appliedEffectsTotal,
        attempts: effectAttempts,
      });
    }
  }

  return { flags, details, ratios };
}

export { checkFlags };
