import { generateSemanticId } from "../semantic-naming.js";
import { getRandomIndex } from "../random.js";

const SCOPES = ["global", "per_player"];

function buildIntVariable(rng) {
  const min = 0;
  const max = 1 + rng.nextInt(20);
  const initial = rng.nextInt(max - min + 1) + min;
  return {
    type: { kind: "int", min, max },
    initial,
  };
}

function buildBoolVariable(rng) {
  return {
    type: { kind: "bool" },
    initial: rng.nextInt(2) === 0,
  };
}

const ENUM_POOLS = [
  ["red", "blue", "green"],
  ["active", "inactive"],
  ["low", "medium", "high"],
  ["open", "closed", "locked"],
];

function buildEnumVariable(rng) {
  const pool = ENUM_POOLS[rng.nextInt(ENUM_POOLS.length)];
  const initial = pool[rng.nextInt(pool.length)];
  return {
    type: { kind: "enum", values: [...pool] },
    initial,
  };
}

const TYPE_BUILDERS = [buildIntVariable, buildBoolVariable, buildEnumVariable];

/**
 * Weighted type selection.
 * int: weight 5, bool: weight 2, enum: weight 2
 * With priority_queue scheduler, per_player int is biased further.
 */
function pickTypeBuilder(rng, biasPriorityQueue) {
  if (biasPriorityQueue && rng.nextInt(3) < 2) {
    return buildIntVariable;
  }
  const weights = [5, 2, 2];
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.nextInt(total);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return TYPE_BUILDERS[i];
  }
  return buildIntVariable;
}

export const variableAddMutation = {
  name: "variable-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);

    if (!definition.state) {
      definition.state = {};
    }
    if (!Array.isArray(definition.state.variables)) {
      definition.state.variables = [];
    }

    const hasPriorityQueue = definition.turn?.scheduler === "priority_queue";

    // Select scope first to vary RNG state before type selection.
    const scopeRoll = getRandomIndex(SCOPES.length, rng);

    const existingIds = new Set(definition.state.variables.map((v) => v.id));
    const typeBuilder = pickTypeBuilder(rng, hasPriorityQueue);
    const { type, initial } = typeBuilder(rng);

    let scope;
    if (hasPriorityQueue && type.kind === "int") {
      scope = rng.nextInt(4) < 3 ? "per_player" : "global";
    } else {
      scope = SCOPES[Math.max(0, scopeRoll)];
    }

    const id = generateSemanticId("variable", null, existingIds);

    definition.state.variables = [
      ...definition.state.variables,
      { id, scope, type, initial },
    ];

    return { ...genome, definition };
  },
};
