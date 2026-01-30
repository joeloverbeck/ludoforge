import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";
import { generateSemanticId } from "../semantic-naming.js";

export const actionDuplicateMutation = {
  name: "action-duplicate",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);
    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const existingIds = new Set(
      targets.map((target) => (typeof target.action?.id === "string" ? target.action.id : null)).filter(Boolean)
    );
    const target = targets[targetIndex];
    const cloned = structuredClone(target.action);
    const nextId = generateSemanticId("action", cloned, existingIds);

    definition.actions.splice(target.index + 1, 0, {
      ...cloned,
      id: nextId,
    });

    return { ...genome, definition };
  },
};
