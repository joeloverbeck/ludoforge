import { createUniqueId } from "../random.js";
import { collectZoneTargets, collectTokenTypeTargets } from "../targets.js";

const SCOPES = ["global", "per_player"];
const ORDERS = ["ordered", "unordered"];
const VISIBILITIES = ["public", "private"];

export const zoneAddMutation = {
  name: "zone-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const existingZones = collectZoneTargets(definition);
    const tokenTypes = collectTokenTypeTargets(definition);

    if (tokenTypes.length === 0) {
      return { ...genome, definition };
    }

    const existingZoneIds = new Set(
      existingZones.map((z) => z.id).filter((id) => typeof id === "string")
    );

    const tokenTypeIndex = rng.nextInt(tokenTypes.length);
    const tokenType = tokenTypes[tokenTypeIndex];

    const newZone = {
      id: createUniqueId(existingZoneIds, "zone"),
      tokenType: tokenType.id,
      scope: SCOPES[rng.nextInt(SCOPES.length)],
      order: ORDERS[rng.nextInt(ORDERS.length)],
      visibility: VISIBILITIES[rng.nextInt(VISIBILITIES.length)],
    };

    definition.state = {
      ...definition.state,
      zones: [...existingZones, newZone],
    };

    return { ...genome, definition };
  },
};
