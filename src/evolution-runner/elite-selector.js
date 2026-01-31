/**
 * Select elite genomes from MAP-Elites results for motif mining.
 * @module evolution-runner/elite-selector
 */

/**
 * @param {{ placements: Array<{ genome: object, fitness: number, coordinates: number[], isElite: boolean }> }} mapElitesResult
 * @param {{ perNicheTopK: number, globalTopK: number }} selectionConfig
 * @returns {Array<{ genome: object, fitness: number }>}
 */
export function selectElitesForMining(mapElitesResult, selectionConfig) {
  const { perNicheTopK, globalTopK } = selectionConfig;

  const elites = (mapElitesResult.placements ?? []).filter(
    (placement) => placement.isElite === true,
  );

  if (elites.length === 0) {
    return [];
  }

  // Group by coordinate key (niche)
  const nicheMap = new Map();
  for (const placement of elites) {
    const key = (placement.coordinates ?? []).join(",");
    if (!nicheMap.has(key)) {
      nicheMap.set(key, []);
    }
    nicheMap.get(key).push(placement);
  }

  // Per-niche top-K by fitness (descending)
  const perNicheSelected = [];
  for (const [, group] of nicheMap) {
    const sorted = [...group].sort((a, b) => b.fitness - a.fitness);
    const topK = sorted.slice(0, perNicheTopK);
    perNicheSelected.push(...topK);
  }

  // Global top-K by fitness (descending)
  const globalSorted = [...elites].sort((a, b) => b.fitness - a.fitness);
  const globalSelected = globalSorted.slice(0, globalTopK);

  // Deduplicate by genome.id
  const seen = new Set();
  const result = [];

  for (const placement of [...perNicheSelected, ...globalSelected]) {
    const id = placement.genome.id;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({ genome: placement.genome, fitness: placement.fitness });
  }

  return result;
}
