import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";
import { buildRandomEffect } from "../effect-helpers.js";

export const chooseEffectInsertMutation = {
  name: "choose-effect-insert",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition);

    const effectTargets = targets.filter((t) => t.list === "effects");
    if (effectTargets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(effectTargets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const chosen = effectTargets[Math.max(0, targetIndex)];
    const action = definition.actions[chosen.actionIndex];
    const effects = action.effects;
    const originalEffect = effects[chosen.effectIndex];

    const alternative = buildRandomEffect(definition, rng);

    const chooseEffect = {
      kind: "rng_choose",
      options: [[originalEffect], [alternative]],
      count: 1,
    };

    const newEffects = [...effects];
    newEffects[chosen.effectIndex] = chooseEffect;

    definition.actions[chosen.actionIndex] = {
      ...action,
      effects: newEffects,
    };

    return { ...genome, definition };
  },
};
