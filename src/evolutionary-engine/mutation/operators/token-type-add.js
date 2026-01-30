import { createUniqueId } from "../random.js";
import { collectTokenTypeTargets, collectZoneTargets } from "../targets.js";

const SCOPES = ["global", "per_player"];
const ORDERS = ["ordered", "unordered"];
const VISIBILITIES = ["public", "private"];

export const tokenTypeAddMutation = {
  name: "token-type-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const existingTokenTypes = collectTokenTypeTargets(definition);
    const existingZones = collectZoneTargets(definition);

    const existingTokenIds = new Set(
      existingTokenTypes.map((t) => t.id).filter((id) => typeof id === "string")
    );
    const existingZoneIds = new Set(
      existingZones.map((z) => z.id).filter((id) => typeof id === "string")
    );

    const tokenTypeId = createUniqueId(existingTokenIds, "token");
    const attrMax = 2 + rng.nextInt(9);

    const newTokenType = {
      id: tokenTypeId,
      attributes: [
        {
          id: "value",
          scope: "global",
          type: { kind: "int", min: 0, max: attrMax },
          initial: 0,
        },
      ],
    };

    const companionZone = {
      id: createUniqueId(existingZoneIds, `${tokenTypeId}_zone`),
      tokenType: tokenTypeId,
      scope: SCOPES[rng.nextInt(SCOPES.length)],
      order: ORDERS[rng.nextInt(ORDERS.length)],
      visibility: VISIBILITIES[rng.nextInt(VISIBILITIES.length)],
    };

    definition.state = {
      ...definition.state,
      tokenTypes: [...existingTokenTypes, newTokenType],
      zones: [...existingZones, companionZone],
    };

    return { ...genome, definition };
  },
};
