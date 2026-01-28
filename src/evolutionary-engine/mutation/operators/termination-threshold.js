import { getRandomIndex } from "../random.js";
import { tweakIntValue } from "../value-tweaks.js";

export const terminationThresholdMutation = {
  name: "termination-threshold",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];

    const targets = conditions
      .map((condition, index) => ({ condition, index }))
      .filter(({ condition }) => {
        const expr = condition?.condition;
        if (!expr || expr.kind !== "cmp") {
          return false;
        }
        const left = expr.left;
        const right = expr.right;
        if (!left || left.kind !== "ref" || left.ref?.kind !== "var") {
          return false;
        }
        if (!right || right.kind !== "value" || typeof right.value !== "number") {
          return false;
        }
        const variable = variables.find((item) => item?.id === left.ref.id);
        return variable?.type?.kind === "int";
      });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const expr = target.condition.condition;
    const variable = variables.find((item) => item?.id === expr.left.ref.id);
    const min = variable?.type?.min;
    const max = variable?.type?.max;
    const current = expr.right.value;
    const nextValue = tweakIntValue(current, min, max, rng);

    const updatedCondition = structuredClone(target.condition);
    updatedCondition.condition = {
      ...updatedCondition.condition,
      right: {
        ...updatedCondition.condition.right,
        value: nextValue,
      },
    };

    definition.termination.conditions[target.index] = updatedCondition;
    return { ...genome, definition };
  },
};
