/**
 * Resolve a candidate pool for active-learning pair selection.
 *
 * Pure function — no I/O, deterministic given a seeded RNG.
 *
 * @module evolution-runner/candidate-pool
 */

/**
 * @typedef {{ genome: { id: string }, fitness: number }} Candidate
 * @typedef {{ strategy: "none" | "topQuantile" | "parentsAndOffspring", topQuantile?: number }} FocusConfig
 */

/**
 * Fisher-Yates shuffle (Knuth) using a seeded RNG.
 * Returns a new array — does not mutate the input.
 *
 * @param {Candidate[]} arr
 * @param {{ nextInt: (max: number) => number }} rng
 * @returns {Candidate[]}
 */
function seededShuffle(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Select the raw pool based on `source`.
 *
 * @param {string} source
 * @param {{ evaluated: Candidate[], elites: Candidate[], shortlist: Candidate[], rng: { nextInt: (max: number) => number } }} ctx
 * @returns {Candidate[]}
 */
function resolveSource(source, { evaluated, elites, shortlist, rng }) {
  switch (source) {
    case "shortlist":
      return shortlist.length > 0 ? [...shortlist] : [...elites];
    case "elites":
      return [...elites];
    case "evaluated":
      return [...evaluated];
    case "mixed": {
      const eliteIds = new Set(elites.map((e) => e.genome.id));
      const nonElite = evaluated.filter((e) => !eliteIds.has(e.genome.id));
      const shuffled = seededShuffle(nonElite, rng);
      return [...elites, ...shuffled];
    }
    default:
      throw new Error(`resolveCandidatePool: unknown source "${source}"`);
  }
}

/**
 * Apply a focus strategy to narrow the pool.
 *
 * @param {Candidate[]} pool
 * @param {FocusConfig} focus
 * @returns {Candidate[]}
 */
function applyFocus(pool, focus) {
  if (!focus || focus.strategy === "none") {
    return pool;
  }

  if (focus.strategy === "topQuantile") {
    const q = focus.topQuantile;
    if (typeof q !== "number" || q <= 0 || q > 1) {
      throw new Error(
        `resolveCandidatePool: topQuantile must be in (0, 1], got ${q}`,
      );
    }
    const sorted = [...pool].sort((a, b) => b.fitness - a.fitness);
    const count = Math.max(1, Math.ceil(sorted.length * q));
    return sorted.slice(0, count);
  }

  if (focus.strategy === "parentsAndOffspring") {
    throw new Error(
      "resolveCandidatePool: focus.strategy=\"parentsAndOffspring\" is not yet " +
      "implemented — genomes do not carry lineage metadata. " +
      "See REMHUMINTHELOO-003 assumption corrections.",
    );
  }

  throw new Error(
    `resolveCandidatePool: unknown focus strategy "${focus.strategy}"`,
  );
}

/**
 * Truncate pool to `maxCandidates` using seeded sampling.
 *
 * @param {Candidate[]} pool
 * @param {number} maxCandidates
 * @param {{ nextInt: (max: number) => number }} rng
 * @returns {Candidate[]}
 */
function truncate(pool, maxCandidates, rng) {
  if (pool.length <= maxCandidates) {
    return pool;
  }
  const shuffled = seededShuffle(pool, rng);
  return shuffled.slice(0, maxCandidates);
}

/**
 * Resolve a candidate pool for preference-learning pair selection.
 *
 * @param {{
 *   source: "shortlist" | "elites" | "evaluated" | "mixed",
 *   focus: FocusConfig,
 *   maxCandidates: number,
 *   evaluated: Candidate[],
 *   elites: Candidate[],
 *   shortlist: Candidate[],
 *   rng: { nextInt: (max: number) => number }
 * }} opts
 * @returns {Candidate[]}
 */
export function resolveCandidatePool({ source, focus, maxCandidates, evaluated, elites, shortlist, rng }) {
  const raw = resolveSource(source, { evaluated, elites, shortlist, rng });
  const focused = applyFocus(raw, focus);
  return truncate(focused, maxCandidates, rng);
}
