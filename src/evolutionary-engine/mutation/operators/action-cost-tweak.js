import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";

function tweakCostAmount(current, rng) {
  if (typeof current !== "number" || !Number.isFinite(current)) {
    return current;
  }
  const magnitude = rng ? (rng.nextInt(2) === 0 ? 1 : 2) : Math.random() < 0.5 ? 1 : 2;
  const direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  const nextAmount = current + direction * magnitude;
  return Math.max(1, nextAmount);
}

export const actionCostTweakMutation = {
  name: "action-cost-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition).filter((target) => {
      if (target.list !== "costs") {
        return false;
      }
      const effect = target.effect;
      return effect?.kind === "dec" && typeof effect.amount === "number";
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const costs = definition.actions[target.actionIndex]?.costs;
    if (!Array.isArray(costs)) {
      return { ...genome, definition };
    }

    const effect = target.effect;
    const nextAmount = tweakCostAmount(effect.amount, rng);
    costs[target.effectIndex] = {
      ...effect,
      amount: nextAmount,
    };

    return { ...genome, definition };
  },
};
