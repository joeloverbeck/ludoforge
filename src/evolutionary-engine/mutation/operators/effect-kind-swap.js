import { getRandomIndex, pickDifferentValue } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";
import { EFFECT_KINDS, buildEffectProps } from "../effect-helpers.js";

export const effectKindSwapMutation = {
  name: "effect-kind-swap",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition);

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

    const currentKind = target.effect.kind;
    const newKind = pickDifferentValue(EFFECT_KINDS, currentKind, rng);
    if (newKind === currentKind) {
      return { ...genome, definition };
    }

    const existingTarget = target.effect.target;
    const props = buildEffectProps(newKind, definition, rng);

    effects[target.effectIndex] = {
      kind: newKind,
      target: existingTarget,
      ...props,
    };

    return { ...genome, definition };
  },
};
