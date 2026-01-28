export const genomePhasesDefinition = {
  version: "1.0",
  players: {
    count: 2,
  },
  state: {
    variables: [],
    tokenTypes: [],
    zones: [],
  },
  actions: [],
  turn: {
    scheduler: "round_robin",
    phases: ["setup", "play", "cleanup"],
  },
  termination: {
    conditions: [],
  },
};
