import type { Effect, Expr, GameDefinition, Ref } from "../../src/dsl/types.js";

const definition: GameDefinition = {
  version: "1.0",
  players: {
    count: 2,
    roles: ["seeker", "keeper"],
  },
  state: {
    variables: [
      {
        id: "score",
        scope: "global",
        type: { kind: "int", min: 0, max: 10 },
        initial: 0,
      },
      {
        id: "active",
        scope: "per_player",
        type: { kind: "bool" },
        initial: false,
      },
    ],
    tokenTypes: [
      {
        id: "pawn",
        attributes: [
          {
            id: "owner",
            scope: "global",
            type: { kind: "enum", values: ["a", "b"] },
            initial: "a",
          },
        ],
      },
    ],
    zones: [
      {
        id: "board",
        tokenType: "pawn",
        scope: "global",
        order: "ordered",
        visibility: "public",
        spatial: {
          nodes: ["a", "b"],
          edges: [["a", "b"]],
        },
      },
    ],
  },
  actions: [
    {
      id: "move",
      actor: "player",
      preconditions: { kind: "value", value: true },
      effects: [
        {
          kind: "move",
          target: { kind: "token", id: "pawn" },
          toZone: "board",
        },
      ],
      targets: [
        {
          id: "piece",
          kind: "token",
          selector: {
            zone: "board",
            count: 1,
          },
        },
      ],
      metadata: {
        phase: "main",
        speed: "normal",
      },
    },
  ],
  turn: {
    scheduler: "round_robin",
    phases: ["main"],
    stepEffects: [
      {
        event: "start_turn",
        effects: [
          {
            kind: "set",
            target: { kind: "var", id: "active" },
            value: true,
          },
        ],
      },
    ],
  },
  termination: {
    conditions: [
      {
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 10 },
        },
        outcome: {
          type: "win",
          players: "active",
        },
      },
    ],
    maxTurns: 20,
    scoring: {
      perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } },
    },
  },
  triggers: [
    {
      event: "after_action",
      condition: { kind: "value", value: true },
      effects: [
        {
          kind: "inc",
          target: { kind: "var", id: "score" },
          amount: 1,
        },
      ],
    },
  ],
};

const expr: Expr = {
  kind: "and",
  left: { kind: "value", value: true },
  right: { kind: "ref", ref: { kind: "var", id: "active" } },
};

const ref: Ref = { kind: "player", id: "p1" };

const effect: Effect = {
  kind: "foreach",
  target: { kind: "zone", id: "board" },
  amount: 1,
};

void definition;
void expr;
void ref;
void effect;

// @ts-expect-error - version is required
const missingVersion: GameDefinition = {
  players: { count: 2 },
  state: { variables: [] },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

// @ts-expect-error - ref id must be a string
const invalidRef: Ref = { kind: "var", id: 123 };

void missingVersion;
void invalidRef;
