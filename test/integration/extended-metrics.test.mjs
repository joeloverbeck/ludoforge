import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptSimulationLog, LOG_ADAPTER_VERSION } from "../../src/evaluation-analytics/log-adapter.js";
import { computeExtendedMetrics } from "../../src/evaluation-analytics/metrics/extended.js";
import { createSimulationEngine } from "../../src/simulation-engine/index.js";

function createWinLoseDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [{ id: "result", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "win",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "result" }, value: 1 },
        ],
      },
      {
        id: "lose",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "result" }, value: -1 },
        ],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "result" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "result" } },
            right: { kind: "value", value: -1 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

function createFirstActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[0]?.id;
    },
  };
}

function createLastActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[legalActions.length - 1]?.id;
    },
  };
}

function getMetric(metrics, id) {
  const metric = metrics.find((entry) => entry.id === id);
  assert.ok(metric, `Expected metric ${id}`);
  return metric.value;
}

describe("extended-metrics", () => {
  it("integrates length, outcome, and coverage summaries", () => {
    const definition = createWinLoseDefinition();
    const winEngine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const loseEngine = createSimulationEngine({
      definition,
      agents: [createLastActionAgent()],
    });

    const results = [winEngine.run(), loseEngine.run()];
    const logResult = adaptSimulationLog({
      version: LOG_ADAPTER_VERSION,
      log: {
        definition,
        results,
      },
    });

    assert.ok(logResult.ok, logResult.ok ? undefined : logResult.error?.message);
    const summaries = logResult.value.trajectorySummaries;
    const metrics = computeExtendedMetrics(definition, summaries);

    assert.ok(Math.abs(getMetric(metrics, "length_mean") - 1) < 1e-9);
    assert.ok(Math.abs(getMetric(metrics, "length_variance") - 0) < 1e-9);
    assert.ok(Math.abs(getMetric(metrics, "early_termination_rate") - 0) < 1e-9);
    assert.ok(Math.abs(getMetric(metrics, "outcome_variance") - 0.25) < 1e-9);
    assert.ok(Math.abs(getMetric(metrics, "coverage_actions") - 1) < 1e-9);
    assert.ok(Math.abs(getMetric(metrics, "coverage_state") - 1) < 1e-9);
  });
});
