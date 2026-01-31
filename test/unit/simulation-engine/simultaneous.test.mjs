import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";

function createSimultaneousDefinition() {
  return {
    version: "1.0",
    players: { count: 2, roles: ["p1", "p2"] },
    state: {
      variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "choose_zero",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
      {
        id: "choose_one",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 10 }],
      },
    ],
    turn: { scheduler: "simultaneous", phases: ["main"], resolution: { order: "by_player_id" } },
    termination: { conditions: [] },
    triggers: [],
  };
}

function createOrderDefinition() {
  return {
    version: "1.0",
    players: { count: 2, roles: ["p1", "p2"] },
    state: {
      variables: [{ id: "marker", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "p1_action",
        actor: "role",
        actorRole: "p1",
        effects: [{ kind: "set", target: { kind: "var", id: "marker" }, value: 1 }],
      },
      {
        id: "p2_action",
        actor: "role",
        actorRole: "p2",
        effects: [{ kind: "set", target: { kind: "var", id: "marker" }, value: 2 }],
      },
    ],
    turn: { scheduler: "simultaneous", phases: ["main"], resolution: { order: "by_player_id" } },
    termination: { conditions: [] },
    triggers: [],
  };
}

describe("simultaneous scheduler", () => {
  it("selects all player actions before resolving any", async () => {
    const definition = createSimultaneousDefinition();
    const selectionLog = [];
    const agents = [
      {
        id: 1,
        selectAction({ state }) {
          selectionLog.push({ playerId: 1, counter: state.variables.global.counter });
          return state.variables.global.counter === 0 ? "choose_zero" : "choose_one";
        },
      },
      {
        id: 2,
        selectAction({ state }) {
          selectionLog.push({ playerId: 2, counter: state.variables.global.counter });
          return state.variables.global.counter === 0 ? "choose_zero" : "choose_one";
        },
      },
    ];

    const engine = createSimulationEngine({ definition, agents, maxSteps: 2 });
    const result = await engine.run();

    assert.deepEqual(selectionLog, [
      { playerId: 1, counter: 0 },
      { playerId: 2, counter: 0 },
    ]);
    assert.deepEqual(
      result.trajectory.steps.map((step) => step.actionId),
      ["choose_zero", "choose_zero"]
    );
  });

  it("resolves actions by player id order", async () => {
    const definition = createOrderDefinition();
    const agents = [
      {
        id: 1,
        selectAction({ legalActions }) {
          return legalActions[0]?.id;
        },
      },
      {
        id: 2,
        selectAction({ legalActions }) {
          return legalActions[0]?.id;
        },
      },
    ];

    const engine = createSimulationEngine({ definition, agents, maxSteps: 2 });
    const result = await engine.run();

    assert.deepEqual(result.trajectory.steps.map((step) => step.playerId), [1, 2]);
    assert.equal(result.trajectory.steps.at(-1)?.state.variables.global.marker, 2);
  });

  it("uses deterministic random resolution with seeded RNG", async () => {
    const definition = createOrderDefinition();
    definition.turn.resolution = { order: "random" };
    const agents = [
      {
        id: 1,
        selectAction({ legalActions }) {
          return legalActions[0]?.id;
        },
      },
      {
        id: 2,
        selectAction({ legalActions }) {
          return legalActions[0]?.id;
        },
      },
    ];

    const first = await createSimulationEngine({ definition, agents, maxSteps: 2, seed: 123 }).run();
    const second = await createSimulationEngine({ definition, agents, maxSteps: 2, seed: 123 }).run();

    assert.deepEqual(
      first.trajectory.steps.map((step) => step.playerId),
      second.trajectory.steps.map((step) => step.playerId)
    );
  });
});
