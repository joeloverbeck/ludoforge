import { getRandomIndex } from "../random.js";

export const phaseRemoveMutation = {
  name: "phase-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const phases = Array.isArray(turn.phases) ? [...turn.phases] : [];
    if (phases.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(phases.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    phases.splice(removeIndex, 1);
    definition.turn = {
      ...turn,
      phases,
    };

    return { ...genome, definition };
  },
};
