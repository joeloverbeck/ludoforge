import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptSimulationLog, LOG_ADAPTER_VERSION } from "../../src/evaluation-analytics/log-adapter.js";
import { computeExtendedMetrics } from "../../src/evaluation-analytics/metrics/extended.js";
import { createSimulationEngine } from "../../src/simulation-engine/index.js";

function createTierSeparationDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "flag", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "burn",
        actor: "player",
        effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: -1 }],
      },
      {
        id: "boost",
        actor: "player",
        effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: 1 }],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "flag" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "flag" } },
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

async function buildSummaries(definition) {
  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent(), createFirstActionAgent()],
  });
  const results = [await engine.run()];
  const logResult = adaptSimulationLog({
    version: LOG_ADAPTER_VERSION,
    log: {
      definition,
      results,
    },
  });

  assert.ok(logResult.ok, logResult.ok ? undefined : logResult.error?.message);
  return logResult.value.trajectorySummaries;
}

describe("skill-expression-metric", () => {
  it("is gated via extended metrics integration path", async () => {
    const definition = createTierSeparationDefinition();
    const summaries = await buildSummaries(definition);

    const disabled = await computeExtendedMetrics(definition, summaries, {
      skillExpression: { enabled: false },
    });
    assert.equal(
      disabled.some((metric) => metric.id === "skill_expression"),
      false
    );

    const enabled = await computeExtendedMetrics(definition, summaries, {
      skillExpression: {
        enabled: true,
        agentTiers: [createFirstActionAgent(), createLastActionAgent()],
        matchesPerSeat: 1,
        seed: 21,
      },
    });

    const metric = enabled.find((entry) => entry.id === "skill_expression");
    assert.ok(metric);
    assert.ok(Number.isFinite(metric.value));
    assert.ok(metric.value >= 0 && metric.value <= 1);
  });
});
