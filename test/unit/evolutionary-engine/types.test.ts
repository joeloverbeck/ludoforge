import type { GameDefinition } from "../../../src/dsl/types.js";
import type {
  CrossoverOperator,
  Genome,
  MutationOperator,
  Niche,
  Population,
  PopulationMember,
  RepairOperator,
} from "../../../src/evolutionary-engine/types.js";

const definition: GameDefinition = {
  version: "0.1.0",
  players: { count: 2 },
  state: {
    variables: [
      {
        id: "score",
        scope: "per_player",
        type: { kind: "int", min: 0 },
        initial: 0,
      },
    ],
  },
  actions: [
    {
      id: "pass",
      actor: "player",
      effects: [],
    },
  ],
  turn: { scheduler: "round_robin" },
  termination: {
    conditions: [
      {
        condition: { kind: "value", value: true },
        outcome: { type: "draw", players: "all" },
      },
    ],
  },
};

const genome: Genome = { id: "g-1", definition };

const member: PopulationMember = {
  genome,
  fitness: 0.8,
  descriptors: { length: 1 },
};

const population: Population = [member];

const niche: Niche = { id: "n-1", coordinates: [0, 1], descriptors: { length: 1 } };

const mutation: MutationOperator = {
  name: "noop",
  mutate: (input) => input,
};

const crossover: CrossoverOperator = {
  name: "noop",
  crossover: (parentA) => parentA,
};

const repair: RepairOperator = {
  name: "noop",
  repair: (input) => input,
};

void population;
void niche;
void mutation;
void crossover;
void repair;
