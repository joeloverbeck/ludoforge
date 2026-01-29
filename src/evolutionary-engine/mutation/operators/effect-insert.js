import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";
import { buildRandomEffect } from "../effect-helpers.js";

export const effectInsertMutation = {
  name: "effect-insert",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const action = definition.actions[targetIndex];
    const effects = Array.isArray(action.effects) ? action.effects : [];
    const newEffect = buildRandomEffect(definition, rng);

    definition.actions[targetIndex] = {
      ...action,
      effects: [...effects, newEffect],
    };

    return { ...genome, definition };
  },
};
