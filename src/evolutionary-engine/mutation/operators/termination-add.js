import { getRandomIndex } from "../random.js";
import { pickOrCreateVariable } from "../pick-or-create.js";

const COMPARATORS = [">=", "<=", ">", "<", "=="];
const OUTCOME_TYPES = ["win", "lose", "draw"];
const PLAYER_SELECTORS = ["active", "all"];

export const terminationAddMutation = {
  name: "termination-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);

    const variable = pickOrCreateVariable(definition, rng, { filter: { kind: "int" } });

    if (!variable) {
      return { ...genome, definition };
    }
    const op = COMPARATORS[getRandomIndex(COMPARATORS.length, rng)];
    const min = typeof variable.type.min === "number" ? variable.type.min : 0;
    const max = typeof variable.type.max === "number" ? variable.type.max : 10;
    const range = max - min;
    // Ensure threshold is not trivially true at turn 0 by requiring > initial.
    const initial = typeof variable.initial === "number" ? variable.initial : min;
    let threshold;
    if (range > 0) {
      threshold = initial + 1 + rng.nextInt(Math.max(1, range - 1));
      if (threshold > max) threshold = max;
    } else {
      threshold = max;
    }

    const condition = {
      kind: "cmp",
      op,
      left: { kind: "ref", ref: { kind: "var", id: variable.id } },
      right: { kind: "value", value: threshold },
    };

    const outcomeType = OUTCOME_TYPES[getRandomIndex(OUTCOME_TYPES.length, rng)];
    const players = PLAYER_SELECTORS[getRandomIndex(PLAYER_SELECTORS.length, rng)];
    const outcome = { type: outcomeType, players };

    if (!definition.termination) {
      definition.termination = { conditions: [], maxTurns: 20 };
    }
    if (!Array.isArray(definition.termination.conditions)) {
      definition.termination.conditions = [];
    }

    definition.termination.conditions = [
      ...definition.termination.conditions,
      { condition, outcome },
    ];

    return { ...genome, definition };
  },
};
