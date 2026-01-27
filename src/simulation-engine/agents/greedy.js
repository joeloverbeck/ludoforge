export function createGreedyPolicy(options = {}) {
  const scoreAction = options.scoreAction;
  return {
    selectAction(input) {
      const { legalActions } = input;
      if (!legalActions || legalActions.length === 0) {
        return undefined;
      }
      if (typeof scoreAction !== "function") {
        return legalActions[0];
      }
      let bestAction = legalActions[0];
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const action of legalActions) {
        const score = scoreAction({ ...input, action });
        if (score == null) {
          continue;
        }
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
      return bestAction;
    },
  };
}
