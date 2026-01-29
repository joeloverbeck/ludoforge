import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adaptSimulationLog,
  LOG_ADAPTER_VERSION,
  LogAdapterError,
} from "../../../src/evaluation-analytics/log-adapter.js";

const definition = {
  version: "0.1.0",
  players: { count: 2 },
  state: {
    variables: [
      {
        id: "score",
        scope: "per_player",
        type: { kind: "int", min: 0 },
        initial: 0,
      },
    ],
  },
  actions: [
    {
      id: "pass",
      actor: "player",
      effects: [],
    },
    {
      id: "take",
      actor: "player",
      effects: [],
    },
  ],
  turn: { scheduler: "round_robin" },
  termination: {
    conditions: [
      {
        condition: { kind: "value", value: true },
        outcome: { type: "draw", players: "all" },
      },
    ],
  },
};

const baseState = {
  variables: {
    global: {},
    perPlayer: {
      1: { score: 0 },
      2: { score: 0 },
    },
  },
  tokens: {},
  zones: {},
  agents: [
    { id: 1, variables: {} },
    { id: 2, variables: {} },
  ],
  turn: { currentPlayer: 1, phase: null, turn: 1 },
  nextTokenId: 1,
};

const step1 = {
  turn: 1,
  phase: null,
  playerId: 1,
  actionId: "pass",
  legalActionCount: 2,
  affectedPlayerIds: [],
  affectedGlobal: false,
  state: baseState,
};

const step2 = {
  turn: 2,
  phase: null,
  playerId: 2,
  actionId: "take",
  legalActionCount: 2,
  affectedPlayerIds: [2],
  affectedGlobal: false,
  state: { ...baseState, turn: { currentPlayer: 2, phase: null, turn: 2 } },
};

const simulationResult = {
  trajectory: { steps: [step1, step2], events: [] },
  outcome: {
    outcomes: { 1: "draw", 2: "draw" },
  },
  terminationReason: "condition",
  terminated: true,
};

const log = {
  definition,
  results: [simulationResult],
  metadata: { candidateId: "candidate-1" },
};

describe("log-adapter", () => {
  describe("adaptSimulationLog", () => {
    it("produces normalized trajectory summaries", () => {
      const result = adaptSimulationLog({ version: LOG_ADAPTER_VERSION, log });
      assert.equal(result.ok, true);
      assert.equal(result.value.trajectorySummaries.length, 1);

      const summary = result.value.trajectorySummaries[0];
      assert.equal(summary.stepCount, 2);
      assert.equal(summary.turnCount, 2);
      assert.deepEqual(summary.actionCounts, { pass: 1, take: 1 });
      assert.equal(summary.uniqueStateCount, 2);
      assert.equal(summary.terminationReason, "condition");
      assert.equal(summary.keySteps.length, 2);
      assert.equal(summary.keySteps[0].actionId, "pass");
      assert.equal(summary.keySteps[1].actionId, "take");
      assert.deepEqual(summary.keySteps[0].affectedPlayerIds, []);
      assert.equal(summary.keySteps[0].affectedGlobal, false);
      assert.deepEqual(summary.keySteps[1].affectedPlayerIds, [2]);
      assert.equal(summary.keySteps[1].affectedGlobal, false);
    });

    it("does not mutate the input log", () => {
      const snapshot = JSON.stringify(log);
      const result = adaptSimulationLog({ version: LOG_ADAPTER_VERSION, log });
      assert.equal(result.ok, true);
      assert.equal(JSON.stringify(log), snapshot);
    });
  });

  describe("error handling", () => {
    it("returns a typed error for invalid version", () => {
      const result = adaptSimulationLog({ version: "0.0.0", log });
      assert.equal(result.ok, false);
      assert.ok(result.error instanceof LogAdapterError);
      assert.equal(result.error.code, "invalid_version");
    });

    it("returns a typed error for malformed results", () => {
      const badLog = {
        definition,
        results: [
          {
            trajectory: { steps: [step1], events: [] },
            outcome: { outcomes: { 1: "draw", 2: "draw" }, reason: "max-turns" },
            terminationReason: "max-turns",
            terminated: false,
          },
        ],
      };
      const result = adaptSimulationLog({ version: LOG_ADAPTER_VERSION, log: badLog });
      assert.equal(result.ok, false);
      assert.ok(result.error instanceof LogAdapterError);
      assert.equal(result.error.code, "invalid_result");
    });
  });
});
