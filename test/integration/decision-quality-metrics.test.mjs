import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptSimulationLog, LOG_ADAPTER_VERSION } from "../../src/evaluation-analytics/log-adapter.js";
import { computeExtendedMetrics } from "../../src/evaluation-analytics/metrics/extended.js";
import { createSimulationEngine } from "../../src/simulation-engine/index.js";

function createMeaningfulChoiceDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 },
      ],
    },
    actions: [
      {
        id: "low",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "score" }, value: 1 },
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
        ],
      },
      {
        id: "high",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "score" }, value: 3 },
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
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
            left: { kind: "ref", ref: { kind: "var", id: "counter" } },
            right: { kind: "value", value: 2 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      scoring: { perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } } },
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

function getMetric(metrics, id) {
  const metric = metrics.find((entry) => entry.id === id);
  assert.ok(metric, `Expected metric ${id}`);
  return metric.value;
}

describe("decision-quality-metrics", () => {
  it("integrates via extended metrics", () => {
    const definition = createMeaningfulChoiceDefinition();
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const results = [engine.run()];

    const logResult = adaptSimulationLog({
      version: LOG_ADAPTER_VERSION,
      log: {
        definition,
        results,
      },
    });

    assert.ok(logResult.ok, logResult.ok ? undefined : logResult.error?.message);
    const summaries = logResult.value.trajectorySummaries;

    const metrics = computeExtendedMetrics(definition, summaries, {
      simulations: results,
      meaningfulChoice: {
        enabled: true,
        decisionSamplesPerRun: 2,
        rolloutsPerAction: 1,
        rolloutMaxSteps: 4,
        maxRolloutsPerRun: 4,
        rolloutAgent: { kind: "random" },
        seed: 42,
      },
      comebackPotential: { enabled: true, earlyStepPercent: 0.5 },
    });

    assert.ok(Math.abs(getMetric(metrics, "choice_value_spread") - 2) < 1e-9);
    const comeback = getMetric(metrics, "comeback_potential");
    assert.ok(comeback >= 0 && comeback <= 1);
  });
});
