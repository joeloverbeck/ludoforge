import { collectUsedIds } from "../../dsl/semantic/used-id-collector.js";

/**
 * Repair operator that strips unused zones, token types, and variables
 * from a genome's definition. Safety net for orphans left by removals,
 * crossover, or edge cases.
 *
 * Keeps at least 1 of each element type to avoid breaking the definition.
 */
export const unusedElementPruneRepair = {
  name: "unused-element-prune",
  repair(genome) {
    const definition = structuredClone(genome.definition);
    const { usedZoneIds, usedTokenTypeIds, usedVariableIds } =
      collectUsedIds(definition);

    const state = definition.state;
    if (!state || typeof state !== "object") {
      return { ...genome, definition };
    }

    // Prune variables
    if (Array.isArray(state.variables) && state.variables.length > 1) {
      const kept = state.variables.filter((v) => usedVariableIds.has(v.id));
      definition.state = {
        ...state,
        variables: kept.length > 0 ? kept : [state.variables[0]],
      };
    }

    // Prune token types
    if (Array.isArray(definition.state.tokenTypes) && definition.state.tokenTypes.length > 1) {
      const kept = definition.state.tokenTypes.filter((t) =>
        usedTokenTypeIds.has(t.id),
      );
      definition.state = {
        ...definition.state,
        tokenTypes:
          kept.length > 0 ? kept : [definition.state.tokenTypes[0]],
      };
    }

    // Build set of surviving token type IDs for zone cascade
    const survivingTokenTypeIds = new Set(
      (definition.state.tokenTypes ?? []).map((t) => t.id),
    );

    // Prune zones (also cascade: drop zones whose tokenType was pruned)
    if (Array.isArray(definition.state.zones) && definition.state.zones.length > 1) {
      const kept = definition.state.zones.filter(
        (z) =>
          usedZoneIds.has(z.id) &&
          (typeof z.tokenType !== "string" ||
            survivingTokenTypeIds.has(z.tokenType)),
      );
      definition.state = {
        ...definition.state,
        zones: kept.length > 0 ? kept : [definition.state.zones[0]],
      };
    }

    return { ...genome, definition };
  },
};
