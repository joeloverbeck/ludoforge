import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";
import { buildRandomEffect } from "../effect-helpers.js";
import { generateSemanticId } from "../semantic-naming.js";

export const actionAddSmallMutation = {
  name: "action-add-small",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);

    if (!Array.isArray(definition.actions)) {
      definition.actions = [];
    }

    const existingIds = new Set(
      definition.actions
        .map((a) => (typeof a?.id === "string" ? a.id : null))
        .filter(Boolean),
    );

    const effect1 = buildRandomEffect(definition, rng);
    const effectCount = rng ? rng.nextInt(2) : Math.floor(Math.random() * 2);
    const effects = [effect1];
    if (effectCount > 0) {
      effects.push(buildRandomEffect(definition, rng));
    }

    const newAction = {
      actor: "player",
      effects,
    };

    const newId = generateSemanticId("action", newAction, existingIds);

    definition.actions = [...definition.actions, { ...newAction, id: newId }];

    return { ...genome, definition };
  },
};
