import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";

export const actionCostRemoveMutation = {
  name: "action-cost-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const costTargets = collectActionEffectTargets(definition).filter(
      (target) => target.list === "costs",
    );

    if (costTargets.length === 0) {
      return { ...genome, definition };
    }

    const idx = getRandomIndex(costTargets.length, rng);
    if (idx < 0) {
      return { ...genome, definition };
    }

    const target = costTargets[idx];
    const action = definition.actions[target.actionIndex];
    const costs = Array.isArray(action?.costs) ? action.costs : [];

    if (costs.length <= 1) {
      delete action.costs;
    } else {
      action.costs = costs.filter((_, i) => i !== target.effectIndex);
    }

    return { ...genome, definition };
  },
};
