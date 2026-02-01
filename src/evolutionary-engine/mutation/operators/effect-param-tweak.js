import { getRandomIndex } from "../random.js";
import { collectActionEffectTargets } from "../targets.js";
import { tweakNonNegative, tweakIntValue } from "../value-tweaks.js";

/**
 * Find the [min, max] bounds for a variable by its id.
 * @param {object} definition
 * @param {string} variableId
 * @returns {{ min: number, max: number } | null}
 */
function findVariableBounds(definition, variableId) {
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  const variable = variables.find((v) => v?.id === variableId);
  if (
    !variable ||
    variable.type?.kind !== "int" ||
    typeof variable.type.min !== "number" ||
    typeof variable.type.max !== "number"
  ) {
    return null;
  }
  return { min: variable.type.min, max: variable.type.max };
}

export const effectParamTweakMutation = {
  name: "effect-param-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition).filter((t) => {
      const effect = t.effect;
      if (!effect) {
        return false;
      }
      if ((effect.kind === "inc" || effect.kind === "dec") && typeof effect.amount === "number") {
        return true;
      }
      if (effect.kind === "set" && typeof effect.value === "number") {
        return true;
      }
      return false;
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const effects = definition.actions[target.actionIndex]?.[target.list];
    if (!Array.isArray(effects)) {
      return { ...genome, definition };
    }

    const effect = target.effect;
    const bounds =
      effect.target?.kind === "var" && typeof effect.target.id === "string"
        ? findVariableBounds(definition, effect.target.id)
        : null;

    if ((effect.kind === "inc" || effect.kind === "dec") && typeof effect.amount === "number") {
      const newAmount = bounds
        ? tweakIntValue(effect.amount, 0, bounds.max - bounds.min, rng)
        : tweakNonNegative(effect.amount, rng);
      effects[target.effectIndex] = {
        ...effect,
        amount: newAmount,
      };
    } else if (effect.kind === "set" && typeof effect.value === "number") {
      const newValue = bounds
        ? tweakIntValue(effect.value, bounds.min, bounds.max, rng)
        : tweakNonNegative(effect.value, rng);
      effects[target.effectIndex] = {
        ...effect,
        value: newValue,
      };
    }

    return { ...genome, definition };
  },
};
