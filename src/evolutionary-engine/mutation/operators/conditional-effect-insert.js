import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets, collectVariableTargets } from "../targets.js";

/**
 * Builds a random `cmp` condition referencing a variable from the definition.
 * Falls back to `{ kind: "value", value: true }` when no variables exist.
 */
function buildRandomCondition(definition, rng) {
  const variables = collectVariableTargets(definition);
  if (variables.length === 0) {
    return { kind: "value", value: true };
  }

  const varIndex = getRandomIndex(variables.length, rng);
  const variable = variables[Math.max(0, varIndex)].variable;

  const ops = ["==", "!=", "<", "<=", ">", ">="];
  const opIndex = getRandomIndex(ops.length, rng);
  const op = ops[Math.max(0, opIndex)];

  const threshold = (getRandomIndex(10, rng) ?? 0) + 1;

  return {
    kind: "cmp",
    op,
    left: { kind: "ref", ref: { kind: "var", id: variable.id } },
    right: { kind: "value", value: threshold },
  };
}

export const conditionalEffectInsertMutation = {
  name: "conditional-effect-insert",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition);

    const effectTargets = targets.filter((t) => t.list === "effects");
    if (effectTargets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(effectTargets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const chosen = effectTargets[Math.max(0, targetIndex)];
    const action = definition.actions[chosen.actionIndex];
    const effects = action.effects;
    const originalEffect = effects[chosen.effectIndex];

    const condition = buildRandomCondition(definition, rng);

    const conditionalEffect = {
      kind: "conditional",
      condition,
      then: [originalEffect],
    };

    const newEffects = [...effects];
    newEffects[chosen.effectIndex] = conditionalEffect;

    definition.actions[chosen.actionIndex] = {
      ...action,
      effects: newEffects,
    };

    return { ...genome, definition };
  },
};
