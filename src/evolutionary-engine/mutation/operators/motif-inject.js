import { getRandomIndex } from "../random.js";
import { collectActionTargets } from "../targets.js";

export function createMotifInjectMutation(motifEffects) {
  return {
    name: "motif-inject",
    mutate(genome, rng) {
      const definition = structuredClone(genome.definition);
      const sequences = Array.isArray(motifEffects) ? motifEffects : [];

      if (sequences.length === 0) {
        return { ...genome, definition };
      }

      const targets = collectActionTargets(definition);
      if (targets.length === 0) {
        return { ...genome, definition };
      }

      const motifIndex = getRandomIndex(sequences.length, rng);
      if (motifIndex < 0) {
        return { ...genome, definition };
      }

      const motif = sequences[motifIndex];
      if (!Array.isArray(motif) || motif.length === 0) {
        return { ...genome, definition };
      }

      const actionIndex = getRandomIndex(targets.length, rng);
      if (actionIndex < 0) {
        return { ...genome, definition };
      }

      const action = definition.actions[actionIndex];
      const existingEffects = Array.isArray(action.effects) ? action.effects : [];

      definition.actions[actionIndex] = {
        ...action,
        effects: [...existingEffects, ...structuredClone(motif)],
      };

      return { ...genome, definition };
    },
  };
}

const DEFAULT_MOTIFS = [
  [
    { kind: "dec", target: { kind: "var", id: "var_0" }, amount: 1 },
    { kind: "inc", target: { kind: "var", id: "var_0" }, amount: 2 },
  ],
  [
    { kind: "set", target: { kind: "var", id: "var_0" }, value: 0 },
    { kind: "inc", target: { kind: "var", id: "var_0" }, amount: 3 },
  ],
  [
    { kind: "inc", target: { kind: "var", id: "var_0" }, amount: 1 },
    { kind: "dec", target: { kind: "var", id: "var_0" }, amount: 1 },
  ],
];

export const motifInjectMutation = createMotifInjectMutation(DEFAULT_MOTIFS);
