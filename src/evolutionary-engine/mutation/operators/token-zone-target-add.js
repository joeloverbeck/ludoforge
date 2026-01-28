import { createUniqueId, getRandomIndex } from "../random.js";
import { collectTokenTypeTargets, collectZoneTargets } from "../targets.js";

export const tokenTypeZoneTargetAddMutation = {
  name: "token-zone-target-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    const zones = collectZoneTargets(definition);
    const actions = Array.isArray(definition?.actions) ? definition.actions : [];

    if (tokenTypes.length === 0 || zones.length === 0 || actions.length === 0) {
      return { ...genome, definition };
    }

    const tokenTypeIndex = getRandomIndex(tokenTypes.length, rng);
    const zoneIndex = getRandomIndex(zones.length, rng);
    const actionIndex = getRandomIndex(actions.length, rng);
    if (tokenTypeIndex < 0 || zoneIndex < 0 || actionIndex < 0) {
      return { ...genome, definition };
    }

    const existingTokenTypeIds = new Set(
      tokenTypes.map((tokenType) => (typeof tokenType?.id === "string" ? tokenType.id : null)).filter(Boolean)
    );
    const existingZoneIds = new Set(
      zones.map((zone) => (typeof zone?.id === "string" ? zone.id : null)).filter(Boolean)
    );
    const existingTargetIds = new Set(
      actions
        .flatMap((action) => (Array.isArray(action?.targets) ? action.targets : []))
        .map((target) => (typeof target?.id === "string" ? target.id : null))
        .filter(Boolean)
    );

    const clonedTokenType = structuredClone(tokenTypes[tokenTypeIndex]);
    const clonedZone = structuredClone(zones[zoneIndex]);
    const nextTokenTypeId = createUniqueId(existingTokenTypeIds, clonedTokenType?.id ?? "token");
    const nextZoneId = createUniqueId(existingZoneIds, clonedZone?.id ?? "zone");
    const nextTargetId = createUniqueId(existingTargetIds, "target");

    definition.state = {
      ...definition.state,
      tokenTypes: [...tokenTypes, { ...clonedTokenType, id: nextTokenTypeId }],
      zones: [
        ...zones,
        {
          ...clonedZone,
          id: nextZoneId,
          tokenType: nextTokenTypeId,
        },
      ],
    };

    const action = actions[actionIndex];
    const targets = Array.isArray(action?.targets) ? [...action.targets] : [];
    targets.push({
      id: nextTargetId,
      kind: "token",
      selector: {
        zone: nextZoneId,
        tokenType: nextTokenTypeId,
        count: 1,
      },
    });
    definition.actions[actionIndex] = {
      ...action,
      targets,
    };

    return { ...genome, definition };
  },
};
