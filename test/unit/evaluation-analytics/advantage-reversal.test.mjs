import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeAdvantageReversalRate } from "../../../src/evaluation-analytics/metrics/extended/decision-quality/advantage-reversal.js";
import { createInitialState } from "../../../src/game-kernel/index.js";

function createScoringDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 }],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [],
      scoring: {
        perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } },
      },
    },
    triggers: [],
  };
}

function createNoScoringDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: { variables: [] },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [] },
    triggers: [],
  };
}

function makeState(definition, scoresByPlayer) {
  const state = createInitialState(definition);
  for (const [playerId, score] of Object.entries(scoresByPlayer)) {
    state.variables.perPlayer[playerId].score = score;
  }
  return state;
}

function makeRun(steps) {
  return {
    trajectory: { steps },
    outcome: { outcomes: {} },
    terminationReason: "condition",
    terminated: true,
  };
}

describe("advantage-reversal", () => {
  describe("computeAdvantageReversalRate", () => {
    it("returns 0 when disabled", () => {
      const definition = createScoringDefinition();
      const result = computeAdvantageReversalRate(definition, [], { enabled: false });
      assert.equal(result, 0);
    });

    it("returns 0 when simulations are empty", () => {
      const definition = createScoringDefinition();
      const result = computeAdvantageReversalRate(definition, [], { enabled: true });
      assert.equal(result, 0);
    });

    it("returns 0 when leader never changes", () => {
      const definition = createScoringDefinition();
      const steps = [
        { state: makeState(definition, { 1: 5, 2: 1 }) },
        { state: makeState(definition, { 1: 6, 2: 2 }) },
        { state: makeState(definition, { 1: 7, 2: 3 }) },
      ];
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      assert.equal(result, 0);
    });

    it("returns expected value when leader alternates every step", () => {
      const definition = createScoringDefinition();
      const steps = [
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1
        { state: makeState(definition, { 1: 1, 2: 5 }) }, // leader: 2 (change)
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1 (change)
      ];
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      // 2 changes / (3-1) steps = 1.0
      assert.equal(result, 1);
    });

    it("returns 0.5 for one change in three steps", () => {
      const definition = createScoringDefinition();
      const steps = [
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1
        { state: makeState(definition, { 1: 5, 2: 1 }) }, // leader: 1 (no change)
        { state: makeState(definition, { 1: 1, 2: 5 }) }, // leader: 2 (change)
      ];
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      // 1 change / (3-1) steps = 0.5
      assert.ok(Math.abs(result - 0.5) < 1e-9);
    });

    it("averages across multiple runs", () => {
      const definition = createScoringDefinition();

      // Run 1: no reversals (0.0)
      const steps1 = [
        { state: makeState(definition, { 1: 5, 2: 1 }) },
        { state: makeState(definition, { 1: 6, 2: 2 }) },
      ];

      // Run 2: one reversal (1.0)
      const steps2 = [
        { state: makeState(definition, { 1: 5, 2: 1 }) },
        { state: makeState(definition, { 1: 1, 2: 5 }) },
      ];

      const runs = [makeRun(steps1), makeRun(steps2)];
      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      // Average of 0.0 and 1.0 = 0.5
      assert.ok(Math.abs(result - 0.5) < 1e-9);
    });

    it("returns 0 when scoring is unavailable", () => {
      const definition = createNoScoringDefinition();
      const steps = [
        { state: { turn: { currentPlayer: 1 }, variables: {} } },
        { state: { turn: { currentPlayer: 2 }, variables: {} } },
      ];
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      assert.equal(result, 0);
    });

    it("skips runs with fewer than 2 steps", () => {
      const definition = createScoringDefinition();
      const steps = [{ state: makeState(definition, { 1: 5, 2: 1 }) }];
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      assert.equal(result, 0);
    });

    it("result is always within [0,1]", () => {
      const definition = createScoringDefinition();
      const steps = [];
      for (let i = 0; i < 20; i += 1) {
        const leader = i % 2 === 0 ? { 1: 5, 2: 1 } : { 1: 1, 2: 5 };
        steps.push({ state: makeState(definition, leader) });
      }
      const runs = [makeRun(steps)];

      const result = computeAdvantageReversalRate(definition, runs, { enabled: true });
      assert.ok(result >= 0, `expected >= 0, got ${result}`);
      assert.ok(result <= 1, `expected <= 1, got ${result}`);
    });
  });
});
