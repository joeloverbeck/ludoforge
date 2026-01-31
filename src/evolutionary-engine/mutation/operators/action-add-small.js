import { getRandomIndex } from "../random.js";
import { collectActionTargets, collectIntVariableTargets } from "../targets.js";
import { buildRandomEffect } from "../effect-helpers.js";
import { generateSemanticId } from "../semantic-naming.js";
import { pickOrCreateVariable } from "../pick-or-create.js";

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

    const addCost = rng ? rng.nextInt(5) === 0 : Math.random() < 0.2;
    if (addCost) {
      const costVar = pickOrCreateVariable(definition, rng, { filter: { kind: "int" } });
      if (costVar) {
        const amount = (rng ? rng.nextInt(3) : Math.floor(Math.random() * 3)) + 1;
        newAction.costs = [
          { kind: "dec", target: { kind: "var", id: costVar.id }, amount },
        ];
      }
    }

    const newId = generateSemanticId("action", newAction, existingIds);

    definition.actions = [...definition.actions, { ...newAction, id: newId }];

    return { ...genome, definition };
  },
};
