export function createRandomPolicy() {
  return {
    selectAction({ legalActions, rng }) {
      if (!legalActions || legalActions.length === 0) {
        return undefined;
      }
      const index = rng?.nextInt
        ? rng.nextInt(legalActions.length)
        : Math.floor(Math.random() * legalActions.length);
      return legalActions[index];
    },
  };
}
