/**
 * Orchestrates seed population generation with coverage-targeting strategies.
 * Generates genomes, evaluates them, bins by MAP-Elites descriptors,
 * and accepts/rejects based on coverage policy.
 */

import { createSeededRng } from "../simulation-engine/rng.js";
import { generateGameDefinition } from "./grammar-generator.js";
import { createGenomeId } from "../evolutionary-engine/serialization.js";
import {
  getDescriptorCoordinates,
  getNicheId,
} from "../evolutionary-engine/map-elites.js";
import {
  computeTotalBinCount,
  computeTargetPerBin,
  shouldAcceptCandidate,
} from "./coverage-policy.js";

const SPECIAL_BIN_RE = /:(unknown|under|over)(\||$)/;

/**
 * Returns true if any segment of the nicheId contains a special bin token.
 * @param {string} nicheId
 * @returns {boolean}
 */
export function hasSpecialBin(nicheId) {
  return SPECIAL_BIN_RE.test(nicheId);
}

/**
 * @param {{
 *   populationSize: number,
 *   maxAttempts: number,
 *   rngSeed: number,
 *   generator?: object,
 *   evaluator: (genome: { id: string, definition: object }) => { descriptors: Record<string, number> },
 *   mapElitesConfig: { descriptors: Array<{ id: string, min: number, max: number, bins: number }> },
 *   coverageStrategy?: string,
 *   fallback?: { strategy: string }
 * }} options
 * @returns {{ genomes: Array<{ id: string, definition: object }>, report: object }}
 */
export function generateSeedPopulation({
  populationSize,
  maxAttempts,
  rngSeed,
  generator,
  evaluator,
  mapElitesConfig,
  coverageStrategy = "random",
  fallback,
}) {
  const rng = createSeededRng(rngSeed);
  const totalBinCount = computeTotalBinCount(mapElitesConfig.descriptors);
  const targetPerBin = computeTargetPerBin(
    coverageStrategy,
    populationSize,
    totalBinCount
  );

  const genomes = [];
  const seenIds = new Set();
  /** @type {Map<string, number>} */
  const binCounts = new Map();
  /** @type {Map<string, number>} */
  const specialBinCounts = new Map();
  const rejectedByReason = {};
  let attempts = 0;
  let inFallback = false;
  let coverageRejectStreak = 0;
  const streakLimit = Math.max(populationSize * 5, 50);

  while (genomes.length < populationSize && attempts < maxAttempts) {
    attempts++;

    let definition;
    try {
      definition = generateGameDefinition({ rng, grammar: generator });
    } catch {
      rejectedByReason["generation-error"] =
        (rejectedByReason["generation-error"] ?? 0) + 1;
      continue;
    }

    let id;
    try {
      id = createGenomeId(definition);
    } catch {
      rejectedByReason["invalid-definition"] =
        (rejectedByReason["invalid-definition"] ?? 0) + 1;
      continue;
    }

    if (seenIds.has(id)) {
      rejectedByReason["duplicate"] =
        (rejectedByReason["duplicate"] ?? 0) + 1;
      continue;
    }

    const genome = { id, definition };

    let evalResult;
    try {
      evalResult = evaluator(genome);
    } catch {
      rejectedByReason["evaluation-error"] =
        (rejectedByReason["evaluation-error"] ?? 0) + 1;
      continue;
    }

    if (evalResult.fitness === null || evalResult.descriptors === null) {
      rejectedByReason["evaluation-error"] =
        (rejectedByReason["evaluation-error"] ?? 0) + 1;
      continue;
    }

    const coordinates = getDescriptorCoordinates(
      evalResult.descriptors,
      mapElitesConfig
    );
    const nicheId = getNicheId(mapElitesConfig, coordinates);

    // Special-bin niches are rejected but tracked separately.
    if (hasSpecialBin(nicheId)) {
      rejectedByReason["special-bin"] =
        (rejectedByReason["special-bin"] ?? 0) + 1;
      specialBinCounts.set(nicheId, (specialBinCounts.get(nicheId) ?? 0) + 1);
      continue;
    }

    if (inFallback) {
      seenIds.add(id);
      genomes.push(genome);
      binCounts.set(nicheId, (binCounts.get(nicheId) ?? 0) + 1);
      continue;
    }

    const decision = shouldAcceptCandidate({
      strategy: coverageStrategy,
      nicheId,
      binCounts,
      targetPerBin,
      totalBinCount,
    });

    if (decision.accept) {
      seenIds.add(id);
      genomes.push(genome);
      binCounts.set(nicheId, (binCounts.get(nicheId) ?? 0) + 1);
      coverageRejectStreak = 0;
    } else {
      rejectedByReason[decision.reason] =
        (rejectedByReason[decision.reason] ?? 0) + 1;
      coverageRejectStreak++;

      if (
        fallback?.strategy === "accept-any-valid" &&
        coverageRejectStreak >= streakLimit
      ) {
        inFallback = true;
      }
    }
  }

  if (genomes.length < populationSize) {
    const breakdown = Object.entries(rejectedByReason)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(", ");
    throw new Error(
      `Failed to generate ${populationSize} genomes after ${attempts} attempts (produced ${genomes.length}). Rejections: ${breakdown || "none"}`
    );
  }

  const binCountsObject = Object.fromEntries(binCounts);
  const specialBinCountsObject = Object.fromEntries(specialBinCounts);

  return {
    genomes,
    report: {
      attempts,
      accepted: genomes.length,
      rejectedByReason,
      binCounts: binCountsObject,
      specialBinCounts: specialBinCountsObject,
      coverageTargetSummary: {
        strategy: coverageStrategy,
        targetPerBin,
        totalBinCount,
        populationSize,
      },
    },
  };
}
