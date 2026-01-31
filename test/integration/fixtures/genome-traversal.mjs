export const genomeTraversalDefinition = {
  version: "1.0",
  players: {
    count: 2,
  },
  state: {
    variables: [
      {
        id: "score",
        scope: "global",
        type: { kind: "int", min: 0, max: 3 },
        initial: 1,
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
          {
            id: "rank",
            scope: "global",
            type: { kind: "int", min: 0, max: 2 },
            initial: 0,
          },
        ],
      },
      {
        id: "piece",
        attributes: [
          {
            id: "owner",
            scope: "global",
            type: { kind: "enum", values: ["a", "b"] },
            initial: "b",
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
      },
      {
        id: "bench",
        tokenType: "piece",
        scope: "global",
        order: "unordered",
        visibility: "public",
      },
    ],
  },
  actions: [
    {
      id: "move",
      actor: "player",
      preconditions: {
        kind: "and",
        left: {
          kind: "ref",
          ref: { kind: "token", id: "pawn", attribute: "rank" },
        },
        right: {
          kind: "ref",
          ref: { kind: "zone", id: "board" },
        },
      },
      costs: [
        {
          kind: "inc",
          target: { kind: "token", id: "pawn", attribute: "owner" },
          amount: 1,
        },
      ],
      effects: [
        {
          kind: "move",
          target: { kind: "token", id: "pawn", attribute: "rank" },
          toZone: "board",
        },
      ],
      params: [
        {
          id: "piece",
          kind: "token",
          domain: {
            selector: {
              zone: "board",
              tokenType: "pawn",
              count: 1,
              where: {
                kind: "cmp",
                op: ">",
                left: {
                  kind: "ref",
                  ref: { kind: "token", id: "pawn", attribute: "rank" },
                },
                right: { kind: "value", value: 0 },
              },
            },
          },
        },
      ],
    },
  ],
  triggers: [
    {
      condition: {
        kind: "ref",
        ref: { kind: "token", id: "pawn", attribute: "rank" },
      },
      effects: [
        {
          kind: "move",
          target: { kind: "token", id: "pawn", attribute: "rank" },
          toZone: "board",
        },
      ],
    },
  ],
  turn: {
    scheduler: "round_robin",
    stepEffects: [
      {
        condition: {
          kind: "ref",
          ref: { kind: "zone", id: "board" },
        },
        effects: [
          {
            kind: "move",
            target: { kind: "token", id: "pawn", attribute: "rank" },
            toZone: "board",
          },
        ],
      },
    ],
  },
  termination: {
    conditions: [
      {
        condition: {
          kind: "ref",
          ref: { kind: "token", id: "pawn", attribute: "rank" },
        },
        outcome: {
          type: "win",
          players: "active",
        },
      },
    ],
    scoring: {
      perPlayer: {
        kind: "ref",
        ref: { kind: "zone", id: "board" },
      },
    },
  },
};
