import { average, safeNumber } from "./math-utils.js";

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
    const terminated = summary?.terminated;
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

export { computeLengthMean, computeLengthVariance, computeEarlyTerminationRate };
