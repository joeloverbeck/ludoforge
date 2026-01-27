export function createBaseDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [],
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: { conditions: [] },
    triggers: [],
  };
}

export function createIncrementAction() {
  return {
    id: "tick",
    actor: "player",
    effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
  };
}

export function createNoopAction() {
  return {
    id: "noop",
    actor: "player",
    effects: [],
  };
}

export function createFirstActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[0]?.id;
    },
  };
}
