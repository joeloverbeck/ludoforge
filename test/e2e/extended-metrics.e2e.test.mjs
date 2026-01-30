import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

/**
 * Extended metrics options that enable all 5 conditional metrics.
 * Uses small caps to keep test fast while still exercising the full pipeline.
 */
const ALL_EXTENDED_OPTIONS = {
  meaningfulChoice: {
    enabled: true,
    decisionSamplesPerRun: 4,
    rolloutsPerAction: 2,
    rolloutMaxSteps: 32,
    maxRolloutsPerRun: 32,
    rolloutAgent: { kind: "random" },
    seed: 100,
  },
  comebackPotential: {
    enabled: true,
    earlyStepPercent: 0.25,
  },
  skillExpression: {
    enabled: true,
    matchesPerSeat: 4,
    agentTiers: ["random", "greedy"],
    seed: 200,
    maxTurns: 20,
    maxSteps: 200,
  },
  advantageReversal: {
    enabled: true,
  },
  policySensitivity: {
    enabled: true,
    matchesPerSeat: 4,
    agentTiers: ["random", "greedy"],
    seed: 300,
    maxTurns: 20,
    maxSteps: 200,
  },
};

const ALWAYS_ON_METRIC_IDS = [
  "length_mean",
  "length_variance",
  "early_termination_rate",
  "outcome_variance",
  "coverage_actions",
  "coverage_state",
];

const CONDITIONAL_METRIC_IDS = [
  "choice_value_spread",
  "comeback_potential",
  "skill_expression",
  "advantage_reversal_rate",
  "policy_sensitivity",
];

describe("extended-metrics E2E", () => {
  describe("determinism", () => {
    it("two evaluator calls with same seed + genome produce identical extended metrics", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const genome = { id: "ext-determinism", definition };

      const opts = {
        seed: 42,
        simulationRuns: 3,
        includeExtendedMetrics: true,
        extendedMetricsOptions: ALL_EXTENDED_OPTIONS,
      };

      const { evaluator: eval1 } = createEvaluator(opts);
      const { evaluator: eval2 } = createEvaluator(opts);

      const result1 = eval1(genome);
      const result2 = eval2(genome);

      assert.ok(result1.fitness !== null, "first call should produce finite fitness");
      assert.ok(result2.fitness !== null, "second call should produce finite fitness");

      assert.deepStrictEqual(
        result1.diagnostics.extendedMetrics,
        result2.diagnostics.extendedMetrics,
        "extended metrics must be identical for identical seed + genome"
      );

      assert.deepStrictEqual(
        result1.diagnostics.featureVector,
        result2.diagnostics.featureVector,
        "feature vectors must be identical for identical seed + genome"
      );

      assert.strictEqual(
        result1.fitness,
        result2.fitness,
        "fitness must be identical for identical seed + genome"
      );
    });
  });

  describe("feature vector wiring", () => {
    it("feature vector contains all conditional extended metric keys when enabled", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const genome = { id: "ext-wiring", definition };

      const { evaluator } = createEvaluator({
        seed: 77,
        simulationRuns: 3,
        includeExtendedMetrics: true,
        extendedMetricsOptions: ALL_EXTENDED_OPTIONS,
      });

      const result = evaluator(genome);
      assert.ok(result.fitness !== null, "evaluation should succeed");

      const fv = result.diagnostics.featureVector;
      for (const key of CONDITIONAL_METRIC_IDS) {
        assert.ok(
          key in fv,
          `feature vector missing conditional metric key: ${key}`
        );
        assert.strictEqual(
          typeof fv[key],
          "number",
          `feature vector key ${key} should be a number`
        );
      }
    });

    it("feature vector contains all always-on extended metric keys", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const genome = { id: "ext-always-on", definition };

      const { evaluator } = createEvaluator({
        seed: 88,
        simulationRuns: 3,
        includeExtendedMetrics: true,
        extendedMetricsOptions: ALL_EXTENDED_OPTIONS,
      });

      const result = evaluator(genome);
      assert.ok(result.fitness !== null, "evaluation should succeed");

      const fv = result.diagnostics.featureVector;
      for (const key of ALWAYS_ON_METRIC_IDS) {
        assert.ok(
          key in fv,
          `feature vector missing always-on metric key: ${key}`
        );
        assert.strictEqual(
          typeof fv[key],
          "number",
          `feature vector key ${key} should be a number`
        );
      }
    });

    it("diagnostics.extendedMetrics is an array with expected metric IDs", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const genome = { id: "ext-diag", definition };

      const { evaluator } = createEvaluator({
        seed: 99,
        simulationRuns: 3,
        includeExtendedMetrics: true,
        extendedMetricsOptions: ALL_EXTENDED_OPTIONS,
      });

      const result = evaluator(genome);
      assert.ok(result.fitness !== null, "evaluation should succeed");

      const extMetrics = result.diagnostics.extendedMetrics;
      assert.ok(Array.isArray(extMetrics), "extendedMetrics should be an array");

      const ids = new Set(extMetrics.map((m) => m.id));
      const expectedIds = [...ALWAYS_ON_METRIC_IDS, ...CONDITIONAL_METRIC_IDS];
      for (const expectedId of expectedIds) {
        assert.ok(ids.has(expectedId), `extendedMetrics missing id: ${expectedId}`);
      }

      for (const metric of extMetrics) {
        assert.strictEqual(typeof metric.id, "string", "metric.id should be a string");
        assert.strictEqual(typeof metric.value, "number", "metric.value should be a number");
      }
    });
  });

  describe("graceful degradation without scoring expression", () => {
    it("comeback_potential and advantage_reversal_rate degrade to 0 without scoring", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = { id: "ext-no-scoring", definition };

      const { evaluator } = createEvaluator({
        seed: 55,
        simulationRuns: 3,
        includeExtendedMetrics: true,
        extendedMetricsOptions: ALL_EXTENDED_OPTIONS,
      });

      const result = evaluator(genome);
      assert.ok(result.fitness !== null, "evaluation should succeed even without scoring");

      const fv = result.diagnostics.featureVector;
      assert.strictEqual(fv.comeback_potential, 0, "comeback_potential should be 0 without scoring expression");
      assert.strictEqual(fv.advantage_reversal_rate, 0, "advantage_reversal_rate should be 0 without scoring expression");
    });
  });

  describe("extended metrics disabled baseline", () => {
    it("extendedMetrics is null when includeExtendedMetrics is false", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const genome = { id: "ext-disabled", definition };

      const { evaluator } = createEvaluator({
        seed: 42,
        simulationRuns: 3,
        includeExtendedMetrics: false,
      });

      const result = evaluator(genome);
      assert.ok(result.fitness !== null, "evaluation should succeed");
      assert.strictEqual(
        result.diagnostics.extendedMetrics,
        null,
        "extendedMetrics should be null when disabled"
      );

      const fv = result.diagnostics.featureVector;
      for (const key of CONDITIONAL_METRIC_IDS) {
        assert.ok(
          !(key in fv),
          `feature vector should NOT contain ${key} when extended metrics disabled`
        );
      }
    });
  });
});
