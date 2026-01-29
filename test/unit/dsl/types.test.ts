import type {
  Effect,
  Expr,
  GameDefinition,
  NoLegalActionsDef,
  Ref
} from "../../../src/dsl/types.js";

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
    noLegalActions: {
      policy: "terminate",
      defaultOutcome: { type: "draw", players: "all" },
      reason: "no-legal-actions",
    },
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

const metaExpr: Expr = {
  kind: "ref",
  ref: { kind: "meta", id: "legalActionCount" },
};

const ref: Ref = { kind: "player", id: "p1" };

const effect: Effect = {
  kind: "hide",
  target: { kind: "zone", id: "board" },
};

// @ts-expect-error - random effect kind was removed
const randomEffect: Effect = { kind: "random", target: { kind: "zone", id: "board" } };

// @ts-expect-error - foreach effect kind was removed
const foreachEffect: Effect = { kind: "foreach", target: { kind: "zone", id: "board" } };

void definition;
void expr;
void metaExpr;
void ref;
void effect;
void randomEffect;
void foreachEffect;

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

// @ts-expect-error - meta refs are not allowed as effect targets
const invalidEffect: Effect = { kind: "set", target: { kind: "meta", id: "hasLegalActions" } };

const invalidNoLegalActions: NoLegalActionsDef = {
  policy: "pass",
  // @ts-expect-error - defaultOutcome is only allowed for terminate policy
  defaultOutcome: { type: "draw", players: "all" },
};

void missingVersion;
void invalidRef;
void invalidEffect;
void invalidNoLegalActions;
