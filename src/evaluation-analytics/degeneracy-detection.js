import { isDrawForAll } from "./outcomes.js";
import {
  DEFAULT_DEGENERACY_THRESHOLDS,
  DEFAULT_DEGENERACY_FLAGS,
  clampNumber,
} from "./degeneracy-config.js";

function formatDetail(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

function isStalemateTermination(summary) {
  return (
    summary?.terminationReason === "stalemate" ||
    summary?.terminationReason === "no-legal-actions"
  );
}

function accumulateStatistics(summaries) {
  let loopDetectedCount = 0;
  let loopRepeatSamples = 0;
  let maxRepeatRatio = 0;
  let maxRepeatedStates = 0;
  let maxLoopSteps = 0;

  let stalemateCount = 0;
  let nonTerminatingCount = 0;
  let maxTurnsCount = 0;
  let maxStepsCount = 0;

  let forcedSamples = 0;
  let forcedSteps = 0;

  const actionTotals = new Map();
  let totalActions = 0;

  const winCounts = new Map();
  let winSamples = 0;
  let winStepTotal = 0;
  let winStepSamples = 0;

  for (const summary of summaries) {
    if (summary?.terminationReason === "loop-detected") {
      loopDetectedCount += 1;
    }
    if (isStalemateTermination(summary) && isDrawForAll(summary?.terminalOutcome?.outcomes)) {
      stalemateCount += 1;
    }
    if (summary?.terminationReason === "max-turns") {
      maxTurnsCount += 1;
    }
    if (summary?.terminationReason === "max-steps") {
      maxStepsCount += 1;
    }
    if (
      summary?.terminated === false ||
      summary?.terminationReason === "max-turns" ||
      summary?.terminationReason === "max-steps" ||
      summary?.terminationReason === "loop-detected"
    ) {
      nonTerminatingCount += 1;
    }

    const stepCount = clampNumber(summary?.stepCount);
    const uniqueStateCount =
      typeof summary?.uniqueStateCount === "number" ? summary.uniqueStateCount : null;

    if (uniqueStateCount != null && stepCount > 0) {
      const repeatedStates = Math.max(0, stepCount - uniqueStateCount);
      const repeatRatio = repeatedStates / stepCount;
      loopRepeatSamples += 1;
      if (repeatRatio > maxRepeatRatio) {
        maxRepeatRatio = repeatRatio;
        maxRepeatedStates = repeatedStates;
        maxLoopSteps = stepCount;
      }
    }

    const steps = summary?.keySteps ?? [];
    for (const step of steps) {
      if (typeof step?.legalActionCount === "number") {
        forcedSamples += 1;
        if (step.legalActionCount <= 1) {
          forcedSteps += 1;
        }
      }
    }

    if (summary?.actionCounts && typeof summary.actionCounts === "object") {
      for (const [actionId, count] of Object.entries(summary.actionCounts)) {
        const numericCount = clampNumber(count);
        if (numericCount > 0) {
          actionTotals.set(actionId, (actionTotals.get(actionId) ?? 0) + numericCount);
          totalActions += numericCount;
        }
      }
    }

    const outcomes = summary?.terminalOutcome?.outcomes;
    if (outcomes && typeof outcomes === "object") {
      const winners = Object.entries(outcomes).filter(([, outcome]) => outcome === "win");
      if (winners.length === 1) {
        const winnerId = winners[0][0];
        winCounts.set(winnerId, (winCounts.get(winnerId) ?? 0) + 1);
        winSamples += 1;
        if (Number.isFinite(summary?.stepCount)) {
          winStepTotal += summary.stepCount;
          winStepSamples += 1;
        }
      }
    }
  }

  return {
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
    winCounts,
    winSamples,
    winStepTotal,
    winStepSamples,
  };
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

  return { flags, details, ratios };
}

function detectDegeneracy(summaries, thresholds = {}) {
  const resolvedThresholds = {
    loopRepeatRatio: clampNumber(
      thresholds.loopRepeatRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.loopRepeatRatio
    ),
    minRepeatedStates: clampNumber(
      thresholds.minRepeatedStates ?? DEFAULT_DEGENERACY_THRESHOLDS.minRepeatedStates
    ),
    forcedMoveRatio: clampNumber(
      thresholds.forcedMoveRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.forcedMoveRatio
    ),
    dominantActionRatio: clampNumber(
      thresholds.dominantActionRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.dominantActionRatio
    ),
    minActionSamples: clampNumber(
      thresholds.minActionSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minActionSamples
    ),
    trivialWinRate: clampNumber(
      thresholds.trivialWinRate ?? DEFAULT_DEGENERACY_THRESHOLDS.trivialWinRate
    ),
    trivialWinMaxAverageSteps: clampNumber(
      thresholds.trivialWinMaxAverageSteps ??
        DEFAULT_DEGENERACY_THRESHOLDS.trivialWinMaxAverageSteps
    ),
    minTrivialWinSamples: clampNumber(
      thresholds.minTrivialWinSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minTrivialWinSamples
    ),
    minStepsForNoChoices: clampNumber(
      thresholds.minStepsForNoChoices ?? DEFAULT_DEGENERACY_THRESHOLDS.minStepsForNoChoices
    ),
  };

  const stats = accumulateStatistics(summaries);
  const { flags, details, ratios } = checkFlags(stats, resolvedThresholds, summaries.length);

  const enabledFlags = new Set(DEFAULT_DEGENERACY_FLAGS);
  const filteredFlags = Array.from(flags).filter((flag) => enabledFlags.has(flag));
  const filteredDetails = {};
  for (const flag of filteredFlags) {
    if (Object.prototype.hasOwnProperty.call(details, flag)) {
      filteredDetails[flag] = details[flag];
    }
  }

  return {
    flags: filteredFlags,
    details: Object.keys(filteredDetails).length > 0 ? filteredDetails : undefined,
    ratios: Object.keys(ratios).length > 0 ? ratios : undefined,
  };
}

export { detectDegeneracy };
