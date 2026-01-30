import { getRandomIndex } from "../random.js";
import { collectVariableTargets } from "../targets.js";

function collectPerPlayerIntVariables(definition) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  return variables.filter(
    (v) => v.scope === "per_player" && v.type?.kind === "int",
  );
}

export const turnOrderEffectInsertMutation = {
  name: "turn-order-effect-insert",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const perPlayerVars = collectPerPlayerIntVariables(definition);

    if (perPlayerVars.length === 0) {
      return { ...genome, definition };
    }

    const varIndex = getRandomIndex(perPlayerVars.length, rng);
    if (varIndex < 0) {
      return { ...genome, definition };
    }

    const variable = perPlayerVars[Math.max(0, varIndex)];
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
