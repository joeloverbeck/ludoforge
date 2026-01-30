import { getRandomIndex } from "../random.js";

function collectSpawnEffectTargets(definition) {
  const targets = [];

  const triggers = Array.isArray(definition?.triggers)
    ? definition.triggers
    : [];
  triggers.forEach((trigger, triggerIndex) => {
    const effects = Array.isArray(trigger?.effects) ? trigger.effects : [];
    effects.forEach((effect, effectIndex) => {
      if (effect.kind === "spawn") {
        targets.push({
          source: "trigger",
          triggerIndex,
          effectIndex,
          effect,
        });
      }
    });
  });

  const actions = Array.isArray(definition?.actions)
    ? definition.actions
    : [];
  actions.forEach((action, actionIndex) => {
    const effects = Array.isArray(action?.effects) ? action.effects : [];
    effects.forEach((effect, effectIndex) => {
      if (effect.kind === "spawn") {
        targets.push({
          source: "action",
          actionIndex,
          effectIndex,
          effect,
        });
      }
    });
  });

  return targets;
}

export const workerCountTweakMutation = {
  name: "worker-count-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectSpawnEffectTargets(definition);

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const chosen = targets[Math.max(0, targetIndex)];
    const currentCount = typeof chosen.effect.count === "number"
      ? chosen.effect.count
      : 1;

    const delta = rng.nextInt(2) === 0 ? -1 : 1;
    const newCount = Math.max(1, currentCount + delta);

    if (chosen.source === "trigger") {
      const trigger = definition.triggers[chosen.triggerIndex];
      const newEffects = [...trigger.effects];
      newEffects[chosen.effectIndex] = {
        ...newEffects[chosen.effectIndex],
        count: newCount,
      };
      definition.triggers[chosen.triggerIndex] = {
        ...trigger,
        effects: newEffects,
      };
    } else {
      const action = definition.actions[chosen.actionIndex];
      const newEffects = [...action.effects];
      newEffects[chosen.effectIndex] = {
        ...newEffects[chosen.effectIndex],
        count: newCount,
      };
      definition.actions[chosen.actionIndex] = {
        ...action,
        effects: newEffects,
      };
    }

    return { ...genome, definition };
  },
};
