export function buildOperatorOutcomes(loopResult) {
  const contributionByGenome = new Map();
  loopResult.mapElites?.placements?.forEach((placement) => {
    if (!placement?.member?.genome) {
      return;
    }
    contributionByGenome.set(
      placement.member.genome,
      placement.contributionKind ?? "none",
    );
  });

  const outcomes = new Map();
  loopResult.evaluated.forEach((entry) => {
    outcomes.set(entry.genome, {
      gridContribution: contributionByGenome.get(entry.genome) ?? "none",
    });
  });

  loopResult.rejected.forEach((entry) => {
    outcomes.set(entry.genome, {
      gridContribution: "none",
    });
  });

  return outcomes;
}
