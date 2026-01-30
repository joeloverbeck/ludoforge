import { getRandomIndex } from "../random.js";

export const phaseRemoveMutation = {
  name: "phase-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const phases = Array.isArray(turn.phases) ? [...turn.phases] : [];
    if (phases.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(phases.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    const removedPhase = phases[removeIndex];
    const removedPhaseId = typeof removedPhase === "string" ? removedPhase : removedPhase?.id;
    phases.splice(removeIndex, 1);
    definition.turn = {
      ...turn,
      phases,
    };

    if (removedPhaseId && Array.isArray(definition.actions)) {
      const remainingPhaseIds = phases.map((p) => (typeof p === "string" ? p : p?.id)).filter(Boolean);
      definition.actions = definition.actions.map((action) => {
        if (!action?.metadata?.phase || action.metadata.phase !== removedPhaseId) {
          return action;
        }
        if (remainingPhaseIds.length > 0) {
          const newPhaseIndex = getRandomIndex(remainingPhaseIds.length, rng);
          const newPhase = remainingPhaseIds[Math.max(0, newPhaseIndex)];
          return { ...action, metadata: { ...action.metadata, phase: newPhase } };
        }
        const { phase: _, ...restMetadata } = action.metadata;
        return { ...action, metadata: restMetadata };
      });
    }

    return { ...genome, definition };
  },
};
