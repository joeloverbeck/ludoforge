import { pickOrCreateVariable } from "../pick-or-create.js";

export const turnOrderEffectInsertMutation = {
  name: "turn-order-effect-insert",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variable = pickOrCreateVariable(definition, rng, {
      filter: { kind: "int", scope: "per_player" },
    });

    if (!variable) {
      return { ...genome, definition };
    }
    const direction = rng.nextInt(2) === 0 ? "asc" : "desc";

    const setTurnOrderEffect = {
      kind: "set_turn_order",
      order: "by_variable",
      variable: variable.id,
      direction,
    };

    const triggers = Array.isArray(definition.triggers)
      ? definition.triggers
      : [];

    const endRoundIndex = triggers.findIndex((t) => t.event === "end_round");

    if (endRoundIndex >= 0) {
      const existing = triggers[endRoundIndex];
      const existingEffects = Array.isArray(existing.effects)
        ? existing.effects
        : [];
      const newTriggers = [...triggers];
      newTriggers[endRoundIndex] = {
        ...existing,
        effects: [...existingEffects, setTurnOrderEffect],
      };
      definition.triggers = newTriggers;
    } else {
      definition.triggers = [
        ...triggers,
        { event: "end_round", effects: [setTurnOrderEffect] },
      ];
    }

    return { ...genome, definition };
  },
};
