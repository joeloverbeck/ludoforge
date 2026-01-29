import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";
import { tweakNonNegative } from "../value-tweaks.js";

export const effectParamTweakMutation = {
  name: "effect-param-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition).filter((t) => {
      const effect = t.effect;
      if (!effect) {
        return false;
      }
      if ((effect.kind === "inc" || effect.kind === "dec") && typeof effect.amount === "number") {
        return true;
      }
      if (effect.kind === "set" && typeof effect.value === "number") {
        return true;
      }
      return false;
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

    const effect = target.effect;
    if ((effect.kind === "inc" || effect.kind === "dec") && typeof effect.amount === "number") {
      effects[target.effectIndex] = {
        ...effect,
        amount: tweakNonNegative(effect.amount, rng),
      };
    } else if (effect.kind === "set" && typeof effect.value === "number") {
      effects[target.effectIndex] = {
        ...effect,
        value: tweakNonNegative(effect.value, rng),
      };
    }

    return { ...genome, definition };
  },
};
