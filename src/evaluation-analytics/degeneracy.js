import { isDrawForAll } from "./outcomes.js";

function clampNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

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

const DEFAULT_DEGENERACY_THRESHOLDS = {
  loopRepeatRatio: 0.25,
  minRepeatedStates: 1,
  forcedMoveRatio: 0.8,
  dominantActionRatio: 0.8,
  minActionSamples: 10,
  trivialWinRate: 0.9,
  trivialWinMaxAverageSteps: 3,
  minTrivialWinSamples: 3,
};

const DEFAULT_DEGENERACY_FILTERS = {
  rejectFlags: [
    "loop",
    "stalemate",
    "forced-move",
    "dominant-action",
    "trivial-win",
    "no-choices",
    "non-terminating",
  ],
};

function detectDegeneracy(summaries, thresholds = {}) {
  const flags = new Set();
  const details = {};

  const loopRepeatRatio = clampNumber(
    thresholds.loopRepeatRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.loopRepeatRatio
  );
  const minRepeatedStates = clampNumber(
    thresholds.minRepeatedStates ?? DEFAULT_DEGENERACY_THRESHOLDS.minRepeatedStates
  );
  const forcedMoveRatio = clampNumber(
    thresholds.forcedMoveRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.forcedMoveRatio
  );
  const dominantActionRatio = clampNumber(
    thresholds.dominantActionRatio ?? DEFAULT_DEGENERACY_THRESHOLDS.dominantActionRatio
  );
  const minActionSamples = clampNumber(
    thresholds.minActionSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minActionSamples
  );
  const trivialWinRate = clampNumber(
    thresholds.trivialWinRate ?? DEFAULT_DEGENERACY_THRESHOLDS.trivialWinRate
  );
  const trivialWinMaxAverageSteps = clampNumber(
    thresholds.trivialWinMaxAverageSteps ??
      DEFAULT_DEGENERACY_THRESHOLDS.trivialWinMaxAverageSteps
  );
  const minTrivialWinSamples = clampNumber(
    thresholds.minTrivialWinSamples ?? DEFAULT_DEGENERACY_THRESHOLDS.minTrivialWinSamples
  );

  let loopDetectedCount = 0;
  let loopRepeatSamples = 0;
  let maxRepeatRatio = 0;
  let maxRepeatedStates = 0;
  let maxLoopSteps = 0;

  let stalemateCount = 0;
  let nonTerminatingCount = 0;
  let maxTurnsCount = 0;

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
    if (summary?.terminalOutcome?.terminated === false || summary?.terminationReason === "max-turns") {
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
      samples: summaries.length,
    });
  }

  if (nonTerminatingCount > 0) {
    flags.add("non-terminating");
    details["non-terminating"] = formatDetail({
      count: nonTerminatingCount,
      max_turns: maxTurnsCount,
      samples: summaries.length,
    });
  }

  if (forcedSamples > 0) {
    const ratio = forcedSteps / forcedSamples;
    if (ratio >= forcedMoveRatio) {
      flags.add("forced-move");
      details["forced-move"] = formatDetail({
        forced_ratio: ratio,
        threshold: forcedMoveRatio,
        forced_steps: forcedSteps,
        samples: forcedSamples,
      });
    }
    if (forcedSteps === forcedSamples) {
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

  return {
    flags: Array.from(flags),
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

function applyDegeneracyFilters(report, options = {}) {
  const rejectFlags = options.rejectFlags ?? DEFAULT_DEGENERACY_FILTERS.rejectFlags;
  const rejectSet = new Set(rejectFlags);
  const rejectedFlags = (report?.flags ?? []).filter((flag) => rejectSet.has(flag));
  return {
    allow: rejectedFlags.length === 0,
    rejectedFlags,
  };
}

export {
  DEFAULT_DEGENERACY_THRESHOLDS,
  DEFAULT_DEGENERACY_FILTERS,
  detectDegeneracy,
  applyDegeneracyFilters,
};
