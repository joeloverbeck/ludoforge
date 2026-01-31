import { getRandomIndex } from "../random.js";

export const variableScopeToggleMutation = {
  name: "variable-scope-toggle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];

    if (variables.length === 0) {
      return { ...genome, definition };
    }

    const targetIdx = getRandomIndex(variables.length, rng);
    if (targetIdx < 0) return { ...genome, definition };

    const variable = variables[targetIdx];
    const newScope = variable.scope === "global" ? "per_player" : "global";

    definition.state.variables = variables.map((v, i) =>
      i === targetIdx ? { ...v, scope: newScope } : v,
    );

    return { ...genome, definition };
  },
};
