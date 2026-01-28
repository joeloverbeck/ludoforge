import { getRandomIndex } from "../random.js";
import { tweakNonNegative } from "../value-tweaks.js";
import { collectActionEffectTargets } from "../targets.js";

export const actionEffectMagnitudeMutation = {
  name: "action-effect-magnitude",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition).filter((target) => {
      const kind = target.effect?.kind;
      return kind === "inc" || kind === "dec" || kind === "random" || kind === "foreach";
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const effects = definition.actions[target.actionIndex]?.[target.list];
    if (!Array.isArray(effects)) {
      return { ...genome, definition };
    }

    const current = target.effect?.amount;
    const nextAmount = tweakNonNegative(current, rng);
    effects[target.effectIndex] = {
      ...target.effect,
      amount: nextAmount,
    };

    return { ...genome, definition };
  },
};
