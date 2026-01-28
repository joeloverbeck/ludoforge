import { getRandomIndex } from "../random.js";
import { collectTokenTypeTargets } from "../targets.js";
import { updateAction, updateExpr, updateTriggers } from "../traversal.js";
import { updateRefTokenType } from "../ref-updaters.js";

export const tokenTypeRemoveMutation = {
  name: "token-type-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    if (tokenTypes.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(tokenTypes.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    const removed = tokenTypes[removeIndex];
    const remaining = tokenTypes.filter((_, index) => index !== removeIndex);
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

    const replacementAttributes = new Set(
      Array.isArray(replacement?.attributes)
        ? replacement.attributes.map((attribute) => attribute?.id).filter((id) => typeof id === "string")
        : []
    );

    if (Array.isArray(definition.state?.zones)) {
      definition.state.zones = definition.state.zones.map((zone) => {
        if (zone?.tokenType === removedId) {
          return { ...zone, tokenType: replacementId };
        }
        return zone;
      });
    }

    if (Array.isArray(definition.actions)) {
      definition.actions.forEach((action) =>
        updateAction(action, {
          onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
          onTokenType: (selector) => {
            if (selector.tokenType === removedId) {
              selector.tokenType = replacementId;
            }
          },
        })
      );
    }

    updateTriggers(definition.triggers, {
      onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
    });
    updateTriggers(definition.turn?.stepEffects, {
      onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
    });

    if (Array.isArray(definition.termination?.conditions)) {
      definition.termination.conditions.forEach((condition) => {
        if (condition?.condition) {
          updateExpr(condition.condition, {
            onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
          });
        }
      });
    }

    if (definition.termination?.scoring?.perPlayer) {
      updateExpr(definition.termination.scoring.perPlayer, {
        onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
      });
    }

    definition.state = {
      ...definition.state,
      tokenTypes: remaining,
    };

    return { ...genome, definition };
  },
};
