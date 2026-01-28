import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";

export const actionRemoveMutation = {
  name: "action-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);
    if (targets.length <= 1) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    definition.actions.splice(targetIndex, 1);
    return { ...genome, definition };
  },
};
