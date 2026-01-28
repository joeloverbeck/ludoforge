import { getRandomIndex } from "../random.js";
import { tweakIntValue } from "../value-tweaks.js";
import { collectVariableTargets } from "../targets.js";

export const numericTweakMutation = {
  name: "numeric-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "int"
    );

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const min = variable?.type?.min;
    const max = variable?.type?.max;
    const nextValue = tweakIntValue(variable?.initial, min, max, rng);

    target.container[target.index] = {
      ...variable,
      initial: nextValue,
    };

    return { ...genome, definition };
  },
};
