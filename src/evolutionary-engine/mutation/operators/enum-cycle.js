import { getRandomIndex, pickDifferentValue } from "../random.js";
import { collectVariableTargets } from "../targets.js";

export const enumCycleMutation = {
  name: "enum-cycle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter((target) => {
      const values = target.variable?.type?.values;
      return target.variable?.type?.kind === "enum" && Array.isArray(values) && values.length > 1;
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const values = Array.isArray(variable?.type?.values) ? variable.type.values : [];
    const nextValue = pickDifferentValue(values, variable?.initial, rng);

    target.container[target.index] = {
      ...variable,
      initial: nextValue,
    };

    return { ...genome, definition };
  },
};
