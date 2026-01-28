export const genomeZonesDefinition = {
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
        attributes: [],
      },
      {
        id: "token",
        attributes: [],
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
        tokenType: "token",
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
      effects: [
        {
          kind: "move",
          target: { kind: "token", id: "pawn" },
          toZone: "bench",
        },
      ],
      targets: [
        {
          id: "piece",
          kind: "token",
          selector: {
            zone: "board",
            tokenType: "pawn",
            count: 1,
          },
        },
      ],
    },
  ],
  turn: {
    scheduler: "round_robin",
  },
  termination: {
    conditions: [
      {
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 3 },
        },
        outcome: {
          type: "win",
          players: "active",
        },
      },
    ],
  },
};
