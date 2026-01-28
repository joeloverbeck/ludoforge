import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";

export const preconditionNegationMutation = {
  name: "precondition-negation",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition).filter((target) => target.action?.preconditions);
    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const action = target.action;
    definition.actions[target.index] = {
      ...action,
      preconditions: { kind: "not", value: action.preconditions },
    };

    return { ...genome, definition };
  },
};
