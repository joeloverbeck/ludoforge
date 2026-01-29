import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";

export const effectDeleteMutation = {
  name: "effect-delete",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);

    const candidates = targets.filter((t) => {
      const effects = t.action?.effects;
      return Array.isArray(effects) && effects.length >= 2;
    });

    if (candidates.length === 0) {
      return { ...genome, definition };
    }

    const candidateIndex = getRandomIndex(candidates.length, rng);
    if (candidateIndex < 0) {
      return { ...genome, definition };
    }

    const picked = candidates[candidateIndex];
    const actionIndex = picked.index;
    const action = definition.actions[actionIndex];
    const effects = [...action.effects];

    const effectIndex = getRandomIndex(effects.length, rng);
    if (effectIndex < 0) {
      return { ...genome, definition };
    }

    effects.splice(effectIndex, 1);
    definition.actions[actionIndex] = { ...action, effects };

    return { ...genome, definition };
  },
};
