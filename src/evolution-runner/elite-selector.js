/**
 * Select elite genomes from MAP-Elites results for motif mining.
 * @module evolution-runner/elite-selector
 */

/**
 * @param {{ placements: Array<{ member: { genome: object, fitness: number, descriptors: object }, nicheId: string, coordinates: number[], isElite: boolean, noveltyScore: number, contributionKind: string }> }} mapElitesResult
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
    const sorted = [...group].sort((a, b) => b.member.fitness - a.member.fitness);
    const topK = sorted.slice(0, perNicheTopK);
    perNicheSelected.push(...topK);
  }

  // Global top-K by fitness (descending)
  const globalSorted = [...elites].sort((a, b) => b.member.fitness - a.member.fitness);
  const globalSelected = globalSorted.slice(0, globalTopK);

  // Deduplicate by genome.id
  const seen = new Set();
  const result = [];

  for (const placement of [...perNicheSelected, ...globalSelected]) {
    if (!placement.member) {
      throw new Error(
        `selectElitesForMining: placement is missing "member" — ` +
        `got keys [${Object.keys(placement).join(", ")}]. ` +
        `Ensure placements come from placePopulationInMapElites.`,
      );
    }
    const id = placement.member.genome.id;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({ genome: placement.member.genome, fitness: placement.member.fitness });
  }

  return result;
}
