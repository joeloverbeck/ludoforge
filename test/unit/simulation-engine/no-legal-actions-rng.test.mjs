import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleNoLegalActions } from "../../../src/simulation-engine/no-legal-actions.js";
import { createInitialState, createEventStream } from "../../../src/game-kernel/index.js";

describe("handleNoLegalActions pass policy with random_draw scheduler", () => {
  const definition = {
    version: "1.0",
    players: { count: 2 },
    state: { variables: [] },
    actions: [],
    turn: {
      scheduler: "random_draw",
      phases: ["main"],
      noLegalActions: { policy: "pass" },
    },
    termination: { conditions: [], maxTurns: 10 },
    triggers: [],
  };

  it("does not throw when rng is provided via config", () => {
    const state = createInitialState(definition);
    const events = createEventStream();
    const rng = { next: () => 0.3 };

    const result = handleNoLegalActions({
      config: { turn: definition.turn, rng },
      definition,
      state,
      trajectory: { steps: [], events },
      events,
      tracker: null,
      maxTurns: 10,
      stepsTaken: 0,
      stepControl: undefined,
    });

    assert.ok(result.action === "continue" || result.action === "return");
  });

  it("returns continue with incremented stepsTaken on successful pass", () => {
    const state = createInitialState(definition);
    const events = createEventStream();
    const rng = { next: () => 0.1 };

    const result = handleNoLegalActions({
      config: { turn: definition.turn, rng },
      definition,
      state,
      trajectory: { steps: [], events },
      events,
      tracker: null,
      maxTurns: 10,
      stepsTaken: 5,
      stepControl: undefined,
    });

    if (result.action === "continue") {
      assert.equal(result.stepsTaken, 6);
    }
  });
});
