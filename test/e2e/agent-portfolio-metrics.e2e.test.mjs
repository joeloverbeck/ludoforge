import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function getMetricValue(metrics, id) {
  const entry = metrics.find((metric) => metric.id === id);
  assert.ok(entry, `expected metric ${id}`);
  return entry.value;
}

const SUITES = [
  {
    id: "greedy-random",
    agents: [{ kind: "greedy" }, { kind: "random" }],
    seedPolicy: "derive",
  },
  {
    id: "random-greedy",
    agents: [{ kind: "random" }, { kind: "greedy" }],
    seedPolicy: "derive",
  },
];

const SUITE_RUNS = {
  "greedy-random": 2,
  "random-greedy": 2,
};

const EXTENDED_OPTIONS = {
  advantageReversal: {
    enabled: true,
    suiteId: "greedy-random",
  },
  policySensitivity: {
    enabled: true,
    matchesPerSeat: 2,
    agentTiers: ["random", "greedy"],
    seed: 123,
    maxTurns: 12,
    maxSteps: 120,
  },
};

describe("agent-portfolio metrics E2E", () => {
  it("runs suites deterministically and wires portfolio metrics", async () => {
    const definition = await loadFixture("per-player-vars-game.json");
    const genome = { id: "portfolio-metrics", definition };

    const opts = {
      seed: 42,
      simulationRuns: 2,
      includeExtendedMetrics: true,
      extendedMetricsOptions: EXTENDED_OPTIONS,
      agentSuites: SUITES,
      agentSuiteRuns: SUITE_RUNS,
      portfolioMetrics: { enabled: true },
    };

    const { evaluator: eval1 } = createEvaluator(opts);
    const { evaluator: eval2 } = createEvaluator(opts);

    const result1 = await eval1(genome);
    const result2 = await eval2(genome);

    assert.ok(result1.fitness !== null, "evaluation should produce fitness");
    assert.ok(result2.fitness !== null, "evaluation should produce fitness");

    const suiteResults = result1.diagnostics.suiteResults;
    assert.ok(suiteResults, "suiteResults should be present when portfolioMetrics is enabled");
    for (const suite of SUITES) {
      assert.ok(suite.id in suiteResults, `suiteResults missing ${suite.id}`);
      assert.equal(
        suiteResults[suite.id].results.length,
        SUITE_RUNS[suite.id],
        `suiteResults should include ${SUITE_RUNS[suite.id]} runs for ${suite.id}`
      );
    }

    const metrics1 = result1.diagnostics.extendedMetrics;
    const metrics2 = result2.diagnostics.extendedMetrics;

    assert.ok(Array.isArray(metrics1), "extendedMetrics should be populated");
    assert.ok(Array.isArray(metrics2), "extendedMetrics should be populated");

    const advantage1 = getMetricValue(metrics1, "advantage_reversal_rate");
    const advantage2 = getMetricValue(metrics2, "advantage_reversal_rate");
    const policy1 = getMetricValue(metrics1, "policy_sensitivity");
    const policy2 = getMetricValue(metrics2, "policy_sensitivity");

    assert.strictEqual(
      advantage1,
      advantage2,
      "advantage_reversal_rate should be deterministic"
    );
    assert.strictEqual(
      policy1,
      policy2,
      "policy_sensitivity should be deterministic"
    );

    assert.ok(advantage1 >= 0 && advantage1 <= 1, "advantage_reversal_rate should be in [0,1]");
    assert.ok(policy1 >= 0 && policy1 <= 1, "policy_sensitivity should be in [0,1]");

    const fv = result1.diagnostics.featureVector;
    assert.ok("advantage_reversal_rate" in fv, "feature vector missing advantage_reversal_rate");
    assert.ok("policy_sensitivity" in fv, "feature vector missing policy_sensitivity");
  });
});
