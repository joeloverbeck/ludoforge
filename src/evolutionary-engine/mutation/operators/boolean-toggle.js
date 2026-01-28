import { getRandomIndex } from "../random.js";
import { collectVariableTargets } from "../targets.js";

export const booleanToggleMutation = {
  name: "boolean-toggle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "bool"
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
    const initial = variable?.initial;
    if (typeof initial !== "boolean") {
      return { ...genome, definition };
    }

    target.container[target.index] = {
      ...variable,
      initial: !initial,
    };

    return { ...genome, definition };
  },
};
