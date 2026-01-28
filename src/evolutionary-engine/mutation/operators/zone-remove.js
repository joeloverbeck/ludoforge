import { getRandomIndex } from "../random.js";
import { collectZoneTargets } from "../targets.js";
import { updateAction, updateExpr, updateTriggers } from "../traversal.js";
import { updateRefZone } from "../ref-updaters.js";

export const zoneRemoveMutation = {
  name: "zone-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const zones = collectZoneTargets(definition);
    if (zones.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(zones.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    const removed = zones[removeIndex];
    const remaining = zones.filter((_, index) => index !== removeIndex);
    const replacementIndex = getRandomIndex(remaining.length, rng);
    if (replacementIndex < 0) {
      return { ...genome, definition };
    }

    const replacement = remaining[replacementIndex];
    const removedId = removed?.id;
    const replacementId = replacement?.id;
    if (typeof removedId !== "string" || typeof replacementId !== "string") {
      return { ...genome, definition };
    }

    if (Array.isArray(definition.actions)) {
      definition.actions.forEach((action) =>
        updateAction(action, {
          onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
          onZone: (selector) => {
            if (selector.zone === removedId) {
              selector.zone = replacementId;
            }
          },
          onZoneTo: (effect) => {
            if (effect.toZone === removedId) {
              effect.toZone = replacementId;
            }
          },
        })
      );
    }

    updateTriggers(definition.triggers, {
      onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      onZoneTo: (effect) => {
        if (effect.toZone === removedId) {
          effect.toZone = replacementId;
        }
      },
    });
    updateTriggers(definition.turn?.stepEffects, {
      onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      onZoneTo: (effect) => {
        if (effect.toZone === removedId) {
          effect.toZone = replacementId;
        }
      },
    });

    if (Array.isArray(definition.termination?.conditions)) {
      definition.termination.conditions.forEach((condition) => {
        if (condition?.condition) {
          updateExpr(condition.condition, {
            onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
          });
        }
      });
    }

    if (definition.termination?.scoring?.perPlayer) {
      updateExpr(definition.termination.scoring.perPlayer, {
        onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      });
    }

    definition.state = {
      ...definition.state,
      zones: remaining,
    };

    return { ...genome, definition };
  },
};
