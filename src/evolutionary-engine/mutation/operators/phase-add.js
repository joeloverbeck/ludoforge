import { generateSemanticId } from "../semantic-naming.js";

export const phaseAddMutation = {
  name: "phase-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const phases = Array.isArray(turn.phases) ? [...turn.phases] : [];
    const existing = new Set(phases.filter((phase) => typeof phase === "string"));
    const nextPhase = generateSemanticId("phase", null, existing);
    phases.push(nextPhase);

    definition.turn = {
      ...turn,
      phases,
    };

    return { ...genome, definition };
  },
};
