import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * We mock feature-vector.js to control nonFiniteKeys returned by assembleFeatureVector.
 * We also mock fitness.js to control the base fitness score.
 * This isolation lets us test reject/penalize policies independently.
 */

let mockNonFiniteKeys = [];
let mockFitnessScore = 0.8;
const mockPerKeyPenalty = 0.05;
const mockMaxPenalty = 0.50;

function computeNonFinitePenaltyMultiplier(count, perKey, maxPen) {
  if (count <= 0) return 1;
  const penalty = Math.min(maxPen, count * perKey);
  return Math.max(0, 1 - penalty);
}

/**
 * Mock computeCoreMetrics to return metrics with non-finite values
 * matching mockNonFiniteKeys. This is needed because the evaluator now
 * computes nonFiniteKeys from allMetrics before assembleFeatureVector.
 */
mock.module("../../../src/evaluation-analytics/metrics/core.js", {
  namedExports: {
    computeCoreMetrics() {
      // Return base finite metrics, but make any metric whose id is in mockNonFiniteKeys non-finite
      const baseMetrics = [
        { id: "agency", value: 0.5 },
        { id: "variety", value: 0.4 },
        { id: "strategic_depth", value: 0.3 },
      ];
      const nonFiniteSet = new Set(mockNonFiniteKeys);
      return baseMetrics.map((m) => ({
        ...m,
        value: nonFiniteSet.has(m.id) ? NaN : m.value,
      })).concat(
        // Add any extra non-finite keys not in base
        mockNonFiniteKeys
          .filter((k) => !baseMetrics.some((m) => m.id === k))
          .map((k) => ({ id: k, value: NaN }))
      );
    },
  },
});

mock.module("../../../src/evaluation-analytics/feature-vector.js", {
  namedExports: {
    assembleFeatureVector(metrics, degeneracy, options) {
      // Build a real-ish vector from metrics
      const vector = {};
      for (const m of Array.isArray(metrics) ? metrics : []) {
        if (m && typeof m.id === "string") {
          vector[m.id] = Number.isFinite(m.value) ? m.value : 0;
        }
      }
      // Include degeneracy flags
      const flags = new Set(Array.isArray(degeneracy?.flags) ? degeneracy.flags : []);
      const order = [
        "loop", "stalemate", "forced-move", "dominant-action", "trivial-win",
        "no-choices", "non-terminating", "high-skipped-effects", "any-cost-abort",
        "high-skipped-triggers", "high-pass-rate", "high-no-legal-actions-termination",
        "non-finite-metrics",
      ];
      for (const flag of order) {
        vector[`degeneracy.${flag}`] = flags.has(flag) ? 1 : 0;
      }
      return { vector, nonFiniteKeys: mockNonFiniteKeys.slice() };
    },
    DEFAULT_FEATURE_ORDER: [],
    DEFAULT_DEGENERACY_ORDER: [],
    NON_FINITE_POLICY_MODE: "penalize",
    NON_FINITE_PER_KEY_PENALTY: mockPerKeyPenalty,
    NON_FINITE_MAX_PENALTY: mockMaxPenalty,
    computeNonFinitePenaltyMultiplier,
  },
});

mock.module("../../../src/evaluation-analytics/fitness.js", {
  namedExports: {
    computePreferenceAwareFitness() {
      return { score: mockFitnessScore };
    },
  },
});

const { createEvaluator } = await import(
  "../../../src/evaluation-analytics/create-evaluator.js"
);

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeGenome(definition = choiceGame) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("createEvaluator — non-finite policy integration", () => {
  // --- Reject policy tests ---

  it("reject policy returns null fitness when any metric is non-finite", async () => {
    mockNonFiniteKeys = ["agency"];
    mockFitnessScore = 0.8;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "reject",
    });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.ok(Array.isArray(result.diagnostics.nonFiniteMetrics));
    assert.deepStrictEqual(result.diagnostics.nonFiniteMetrics, ["agency"]);
    assert.equal(result.diagnostics.nonFinitePolicy, "reject");
  });

  it("reject policy returns normal result when all metrics finite", async () => {
    mockNonFiniteKeys = [];
    mockFitnessScore = 0.75;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "reject",
    });
    const result = await evaluator(makeGenome());

    assert.equal(typeof result.fitness, "number");
    assert.ok(Number.isFinite(result.fitness));
    assert.equal(result.fitness, 0.75);
  });

  // --- Penalize policy tests ---

  it("penalize policy reduces fitness proportionally", async () => {
    mockNonFiniteKeys = ["metric_a", "metric_b"];
    mockFitnessScore = 1.0;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "penalize",
      nonFinitePenalty: { perKeyPenalty: 0.05, maxPenalty: 0.50 },
    });
    const result = await evaluator(makeGenome());

    // 2 keys * 0.05 = 0.10 penalty → multiplier = 0.90
    const expected = 1.0 * 0.90;
    assert.ok(Math.abs(result.fitness - expected) < 1e-10,
      `expected ${expected}, got ${result.fitness}`);
  });

  it("penalize policy caps at maxPenalty", async () => {
    // 20 keys * 0.05 = 1.0, capped at 0.50 → multiplier = 0.50
    mockNonFiniteKeys = Array.from({ length: 20 }, (_, i) => `metric_${i}`);
    mockFitnessScore = 1.0;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "penalize",
      nonFinitePenalty: { perKeyPenalty: 0.05, maxPenalty: 0.50 },
    });
    const result = await evaluator(makeGenome());

    const expected = 1.0 * 0.50;
    assert.ok(Math.abs(result.fitness - expected) < 1e-10,
      `expected ${expected}, got ${result.fitness}`);
  });

  it("penalize policy with 0 non-finite keys applies no penalty", async () => {
    mockNonFiniteKeys = [];
    mockFitnessScore = 0.6;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "penalize",
    });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, 0.6);
    assert.equal(result.diagnostics.nonFinitePenaltyMultiplier, undefined);
    assert.equal(result.diagnostics.nonFiniteMetrics, undefined);
  });

  it("fitness strictly decreases as nonFiniteKeys.length increases", async () => {
    mockFitnessScore = 1.0;
    const fitnesses = [];

    for (const count of [0, 1, 2, 3]) {
      mockNonFiniteKeys = Array.from({ length: count }, (_, i) => `m_${i}`);
      const { evaluator } = createEvaluator({
        simulationRuns: 1,
        nonFinitePolicy: "penalize",
        nonFinitePenalty: { perKeyPenalty: 0.05, maxPenalty: 0.50 },
      });
      const result = await evaluator(makeGenome());
      fitnesses.push(result.fitness);
    }

    for (let i = 1; i < fitnesses.length; i++) {
      assert.ok(fitnesses[i - 1] > fitnesses[i],
        `fitness[${i - 1}]=${fitnesses[i - 1]} should be > fitness[${i}]=${fitnesses[i]}`);
    }
  });

  // --- Diagnostics tests ---

  it("diagnostics include nonFiniteMetrics and multiplier when penalizing", async () => {
    mockNonFiniteKeys = ["a", "b", "c"];
    mockFitnessScore = 0.8;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "penalize",
      nonFinitePenalty: { perKeyPenalty: 0.05, maxPenalty: 0.50 },
    });
    const result = await evaluator(makeGenome());

    assert.ok(Array.isArray(result.diagnostics.nonFiniteMetrics));
    assert.equal(result.diagnostics.nonFiniteMetrics.length, 3);
    assert.ok(result.diagnostics.nonFinitePenaltyMultiplier < 1);
    // 3 * 0.05 = 0.15 → multiplier = 0.85
    assert.ok(Math.abs(result.diagnostics.nonFinitePenaltyMultiplier - 0.85) < 1e-10);
  });

  // --- Evaluator-level override ---

  it("evaluator-level override: reject overrides default penalize", async () => {
    mockNonFiniteKeys = ["metric_x"];
    mockFitnessScore = 0.9;
    // Default module-level policy is "penalize", but we override to "reject"
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "reject",
    });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.nonFinitePolicy, "reject");
  });

  it("evaluator-level override: custom penalty parameters", async () => {
    mockNonFiniteKeys = ["a", "b"];
    mockFitnessScore = 1.0;
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      nonFinitePolicy: "penalize",
      nonFinitePenalty: { perKeyPenalty: 0.10, maxPenalty: 0.80 },
    });
    const result = await evaluator(makeGenome());

    // 2 * 0.10 = 0.20 penalty → multiplier = 0.80
    const expected = 1.0 * 0.80;
    assert.ok(Math.abs(result.fitness - expected) < 1e-10,
      `expected ${expected}, got ${result.fitness}`);
  });
});
