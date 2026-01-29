import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";

export const effectReorderMutation = {
  name: "effect-reorder",
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

    const indexA = getRandomIndex(effects.length, rng);
    const indexB = getRandomIndex(effects.length, rng);
    if (indexA < 0 || indexB < 0 || indexA === indexB) {
      return { ...genome, definition };
    }

    const temp = effects[indexA];
    effects[indexA] = effects[indexB];
    effects[indexB] = temp;

    definition.actions[actionIndex] = { ...action, effects };

    return { ...genome, definition };
  },
};
