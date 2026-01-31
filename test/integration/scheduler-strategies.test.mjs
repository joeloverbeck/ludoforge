import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../src/simulation-engine/index.js";

function createFirstActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[0]?.id;
    },
  };
}

function winWhenCounterReaches(n) {
  return {
    condition: {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "counter" } },
      right: { kind: "value", value: n },
    },
    outcome: { type: "win", players: "active" },
  };
}

function makeBaseDefinition(schedulerOverrides) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "time", scope: "per_player", type: { kind: "int" }, initial: 0 },
      ],
    },
    actions: [
      {
        id: "tick",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
    ],
    turn: {
      scheduler: "round_robin",
      phases: ["main"],
      ...schedulerOverrides,
    },
    termination: {
      conditions: [winWhenCounterReaches(3)],
      maxTurns: 50,
    },
    triggers: [],
  };
}

async function runGame(def) {
  const engine = createSimulationEngine({
    definition: def,
    agents: [createFirstActionAgent()],
  });
  return await engine.run();
}

describe("scheduler strategies through simulation engine", () => {
  it("round_robin: terminates via win condition", async () => {
    const def = makeBaseDefinition({ scheduler: "round_robin" });
    const result = await runGame(def);
    assert.strictEqual(result.terminationReason, "condition");
    assert.strictEqual(result.terminated, true);
    assert.ok(result.trajectory.steps.length >= 3);
  });

  it("priority_queue: terminates via win condition", async () => {
    const def = makeBaseDefinition({
      scheduler: "priority_queue",
      orderBy: { variable: "time", direction: "asc" },
    });
    const result = await runGame(def);
    assert.strictEqual(result.terminationReason, "condition");
    assert.strictEqual(result.terminated, true);
    assert.ok(result.trajectory.steps.length >= 3);
  });

  it("simultaneous: terminates via win condition", async () => {
    const def = makeBaseDefinition({ scheduler: "simultaneous" });
    const result = await runGame(def);
    assert.strictEqual(result.terminationReason, "condition");
    assert.strictEqual(result.terminated, true);
    assert.ok(result.trajectory.steps.length >= 3);
  });
});
