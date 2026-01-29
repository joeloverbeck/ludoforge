import { createSeededRng } from "../../../src/simulation-engine/rng.js";

export const defaultGrammar = {
  limits: {
    minVariables: 1,
    maxVariables: 5,
    minActions: 1,
    maxActions: 5,
  },
  weights: { inc: 3, dec: 2, set: 1 },
};

export const minimalGrammar = {
  limits: {
    minVariables: 1,
    maxVariables: 1,
    minActions: 1,
    maxActions: 1,
  },
  weights: { inc: 1 },
};

export const decOnlyGrammar = {
  limits: {
    minVariables: 2,
    maxVariables: 2,
    minActions: 2,
    maxActions: 2,
  },
  weights: { dec: 1 },
};

export const maxGrammar = {
  limits: {
    minVariables: 5,
    maxVariables: 5,
    minActions: 5,
    maxActions: 5,
  },
  weights: { inc: 1, dec: 1, set: 1 },
};

export function makeRng(seed) {
  return createSeededRng(seed);
}
