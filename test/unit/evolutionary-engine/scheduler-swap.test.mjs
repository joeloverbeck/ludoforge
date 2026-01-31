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

  it("includes simultaneous and random_draw as valid swap targets", () => {
    const genome = makeBaseGenome();
    const schedulers = new Set();
    for (let seed = 0; seed < 10000; seed++) {
      const rng = createSeededRng(seed);
      const result = schedulerSwapMutation.mutate(genome, rng);
      schedulers.add(result.definition.turn.scheduler);
    }
    assert.ok(schedulers.has("simultaneous"), "simultaneous should be reachable");
    assert.ok(schedulers.has("random_draw"), "random_draw should be reachable");
  });

  it("sets resolution.order when swapping to simultaneous", () => {
    const genome = makeBaseGenome();
    // Find a seed that produces simultaneous
    let result;
    for (let seed = 0; seed < 10000; seed++) {
      const rng = createSeededRng(seed);
      result = schedulerSwapMutation.mutate(genome, rng);
      if (result.definition.turn.scheduler === "simultaneous") break;
    }
    assert.equal(result.definition.turn.scheduler, "simultaneous");
    assert.ok(result.definition.turn.resolution);
    assert.ok(["by_player_id", "random"].includes(result.definition.turn.resolution.order));
  });

  it("strips resolution when swapping away from simultaneous", () => {
    const genome = makeBaseGenome({
      scheduler: "simultaneous",
      resolution: { order: "by_player_id" },
    });
    const rng = createSeededRng(0);

    const result = schedulerSwapMutation.mutate(genome, rng);
    assert.notEqual(result.definition.turn.scheduler, "simultaneous");
    assert.equal(result.definition.turn.resolution, undefined);
  });

  it("random_draw requires no extra fields", () => {
    const genome = makeBaseGenome();
    let result;
    for (let seed = 0; seed < 10000; seed++) {
      const rng = createSeededRng(seed);
      result = schedulerSwapMutation.mutate(genome, rng);
      if (result.definition.turn.scheduler === "random_draw") break;
    }
    assert.equal(result.definition.turn.scheduler, "random_draw");
    assert.equal(result.definition.turn.orderBy, undefined);
    assert.equal(result.definition.turn.tokenType, undefined);
    assert.equal(result.definition.turn.resolution, undefined);
  });
});
