import { getRandomIndex } from "../random.js";

export const terminationRemoveMutation = {
  name: "termination-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];

    // Never reduce below 1 condition.
    if (conditions.length <= 1) {
      return { ...genome, definition };
    }

    const removeIdx = getRandomIndex(conditions.length, rng);
    if (removeIdx < 0) return { ...genome, definition };

    definition.termination.conditions = conditions.filter((_, i) => i !== removeIdx);

    return { ...genome, definition };
  },
};
