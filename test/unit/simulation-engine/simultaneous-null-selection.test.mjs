import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";

/**
 * Regression test for the simultaneous-loop infinite-loop bug.
 *
 * When selectAndValidateAction returns null (all legal actions fail bounds
 * checking), the simultaneous loop must terminate — not loop forever without
 * incrementing stepsTaken.
 */

function createBoundsFailDefinition() {
  return {
    version: "1.0",
    players: { count: 2, roles: ["p1", "p2"] },
    state: {
      variables: [
        {
          id: "energy",
          scope: "global",
          type: { kind: "int", min: 0, max: 100 },
          initial: 0,
        },
      ],
    },
    actions: [
      {
        id: "drain",
        actor: "player",
        costs: [],
        effects: [
          { kind: "inc", target: { kind: "var", id: "energy", scope: "global" }, amount: -10 },
        ],
      },
    ],
    turn: {
      scheduler: "simultaneous",
      phases: ["main"],
      resolution: { order: "by_player_id" },
    },
    termination: { conditions: [] },
    triggers: [],
  };
}

describe("simultaneous loop null selection termination", () => {
  it("terminates when all actions fail bounds checking instead of looping forever", async () => {
    const definition = createBoundsFailDefinition();
    const agents = [
      {
        id: 1,
        selectAction({ legalActions }) {
          return { actionId: legalActions[0]?.id ?? "drain", args: {} };
        },
      },
      {
        id: 2,
        selectAction({ legalActions }) {
          return { actionId: legalActions[0]?.id ?? "drain", args: {} };
        },
      },
    ];

    const engine = createSimulationEngine({
      definition,
      agents,
      maxSteps: 100,
    });

    const result = await engine.run();

    assert.ok(result, "simulation should return a result, not hang");
    assert.equal(result.terminationReason, "stalemate",
      "default no-legal-actions policy should produce stalemate");
    assert.equal(result.terminated, true);
  });

  it("terminates promptly (not after maxSteps iterations)", async () => {
    const definition = createBoundsFailDefinition();
    const agents = [
      {
        id: 1,
        selectAction() {
          return { actionId: "drain", args: {} };
        },
      },
      {
        id: 2,
        selectAction() {
          return { actionId: "drain", args: {} };
        },
      },
    ];

    const engine = createSimulationEngine({
      definition,
      agents,
      maxSteps: 50_000,
    });

    const start = Date.now();
    const result = await engine.run();
    const elapsed = Date.now() - start;

    assert.ok(result, "simulation should return a result");
    assert.ok(elapsed < 5000, `should terminate promptly, took ${elapsed}ms`);
  });
});
