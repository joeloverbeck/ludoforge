/**
 * Coverage-targeting strategies for seed population generation.
 * Determines how genomes are distributed across MAP-Elites bins.
 */

/**
 * @param {Array<{ bins: number }>} descriptors
 * @returns {number}
 */
export function computeTotalBinCount(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    throw new Error("Descriptors must be a non-empty array");
  }
  return descriptors.reduce((product, d) => product * d.bins, 1);
}

/**
 * @param {string} strategy
 * @param {number} populationSize
 * @param {number} totalBinCount
 * @returns {number}
 */
export function computeTargetPerBin(strategy, populationSize, totalBinCount) {
  switch (strategy) {
    case "uniform-bins":
    case "underfilled-first":
      return Math.ceil(populationSize / totalBinCount);
    case "random":
      return Infinity;
    default:
      throw new Error(`Unknown coverage strategy: ${strategy}`);
  }
}

/**
 * @param {{
 *   strategy: string,
 *   nicheId: string,
 *   binCounts: Map<string, number>,
 *   targetPerBin: number,
 *   totalBinCount: number
 * }} opts
 * @returns {{ accept: boolean, reason?: string }}
 */
export function shouldAcceptCandidate({
  strategy,
  nicheId,
  binCounts,
  targetPerBin,
  totalBinCount,
}) {
  if (strategy === "random") {
    return { accept: true };
  }

  const currentCount = binCounts.get(nicheId) ?? 0;

  if (strategy === "uniform-bins") {
    if (currentCount < targetPerBin) {
      return { accept: true };
    }
    return { accept: false, reason: "bin-full" };
  }

  if (strategy === "underfilled-first") {
    if (currentCount < targetPerBin) {
      return { accept: true };
    }
    const occupiedBinsBelow = [...binCounts.values()].filter(
      (count) => count < targetPerBin
    ).length;
    const unoccupiedBinCount = totalBinCount - binCounts.size;
    const underfilled = occupiedBinsBelow + unoccupiedBinCount;
    if (underfilled > 0) {
      return { accept: false, reason: "underfilled-bins-available" };
    }
    return { accept: true };
  }

  throw new Error(`Unknown coverage strategy: ${strategy}`);
}
