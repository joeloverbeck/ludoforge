import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { schedulerSwapMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

function makeBaseGenome(schedulerOverrides = {}) {
  return {
    id: "test-genome",
    definition: {
      version: "1.0",
      players: { count: 2 },
      state: {
        variables: [
          { id: "time", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
        ],
        tokenTypes: [{ id: "action_token", attributes: [] }],
        zones: [
          { id: "hand", tokenType: "action_token", scope: "per_player", order: "ordered", visibility: "public" },
        ],
      },
      actions: [
        {
          id: "wait",
          actor: "player",
          effects: [{ kind: "inc", target: { kind: "var", id: "time" }, amount: 1 }],
        },
      ],
      turn: {
        scheduler: "round_robin",
        phases: ["main"],
        ...schedulerOverrides,
      },
      termination: { conditions: [] },
      triggers: [],
    },
  };
}

describe("scheduler-swap mutation", () => {
  it("includes reactive as a valid swap target", () => {
    const genome = makeBaseGenome();
    // Run many seeds to collect all possible outputs
    const schedulers = new Set();
    for (let seed = 0; seed < 5000; seed++) {
      const rng = createSeededRng(seed);
      const result = schedulerSwapMutation.mutate(genome, rng);
      schedulers.add(result.definition.turn.scheduler);
    }
    assert.ok(schedulers.has("reactive"), "reactive should be a reachable swap target");
  });

  it("can swap from reactive to another scheduler", () => {
    const genome = makeBaseGenome({ scheduler: "reactive" });
    const rng = createSeededRng(0);

    const result = schedulerSwapMutation.mutate(genome, rng);
    assert.notEqual(result.definition.turn.scheduler, "reactive");
  });

  it("strips scheduler-specific fields when swapping away from priority_queue", () => {
    const genome = makeBaseGenome({
      scheduler: "priority_queue",
      orderBy: { variable: "time", direction: "asc" },
    });
    const rng = createSeededRng(1);

    const result = schedulerSwapMutation.mutate(genome, rng);
    assert.notEqual(result.definition.turn.scheduler, "priority_queue");
    assert.equal(result.definition.turn.orderBy, undefined);
  });
});
