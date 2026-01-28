import { getRandomIndex, pickDifferentValue } from "../random.js";

export const terminationOutcomeMutation = {
  name: "termination-outcome",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];
    if (conditions.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(conditions.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const condition = conditions[targetIndex];
    const outcome = condition?.outcome;
    if (!outcome || typeof outcome !== "object") {
      return { ...genome, definition };
    }

    const nextType = pickDifferentValue(["win", "lose", "draw"], outcome.type, rng);
    definition.termination.conditions[targetIndex] = {
      ...condition,
      outcome: {
        ...outcome,
        type: nextType,
      },
    };

    return { ...genome, definition };
  },
};
