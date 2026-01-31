import { getRandomIndex } from "../random.js";

export const triggerRemoveMutation = {
  name: "trigger-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const triggers = Array.isArray(definition.triggers) ? definition.triggers : [];

    if (triggers.length === 0) {
      return { ...genome, definition };
    }

    const removeIdx = getRandomIndex(triggers.length, rng);
    if (removeIdx < 0) {
      return { ...genome, definition };
    }

    definition.triggers = triggers.filter((_, i) => i !== removeIdx);

    return { ...genome, definition };
  },
};
