import { collectTokenTypeTargets, collectZoneTargets } from "../targets.js";
import { generateSemanticId } from "../semantic-naming.js";

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

    const attrMax = 2 + rng.nextInt(9);

    const newTokenType = {
      attributes: [
        {
          id: "value",
          scope: "global",
          type: { kind: "int", min: 0, max: attrMax },
          initial: 0,
        },
      ],
    };

    const tokenTypeId = generateSemanticId("token", newTokenType, existingTokenIds);

    const companionZone = {
      tokenType: tokenTypeId,
      scope: SCOPES[rng.nextInt(SCOPES.length)],
      order: ORDERS[rng.nextInt(ORDERS.length)],
      visibility: VISIBILITIES[rng.nextInt(VISIBILITIES.length)],
    };

    const companionZoneId = generateSemanticId("zone", companionZone, existingZoneIds);

    definition.state = {
      ...definition.state,
      tokenTypes: [...existingTokenTypes, { ...newTokenType, id: tokenTypeId }],
      zones: [...existingZones, { ...companionZone, id: companionZoneId }],
    };

    return { ...genome, definition };
  },
};
