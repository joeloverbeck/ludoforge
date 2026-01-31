import { isDrawForAll } from "./outcomes.js";
import { clampNumber } from "./degeneracy-config.js";

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

  let skippedEffectsTotal = 0;
  let appliedEffectsTotal = 0;

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

    if (typeof summary?.totalSkippedEffects === "number") {
      skippedEffectsTotal += summary.totalSkippedEffects;
    }
    if (typeof summary?.totalAppliedEffects === "number") {
      appliedEffectsTotal += summary.totalAppliedEffects;
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
    skippedEffectsTotal,
    appliedEffectsTotal,
    winCounts,
    winSamples,
    winStepTotal,
    winStepSamples,
  };
}

export { accumulateStatistics };
