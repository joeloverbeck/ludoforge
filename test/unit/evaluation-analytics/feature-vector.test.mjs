import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_DEGENERACY_ORDER,
  DEFAULT_FEATURE_ORDER,
  NON_FINITE_POLICY_MODE,
  NON_FINITE_PER_KEY_PENALTY,
  NON_FINITE_MAX_PENALTY,
  computeNonFinitePenaltyMultiplier,
  assembleFeatureVector,
} from "../../../src/evaluation-analytics/feature-vector.js";
import { METRIC_IDS } from "../../../src/evaluation-analytics/metric-ids.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("feature-vector", () => {
  describe("DEFAULT_FEATURE_ORDER", () => {
    it("matches metrics-core config featureOrder", async () => {
      const config = await readJson("../../../configs/metrics-core.json");
      assert.deepEqual(DEFAULT_FEATURE_ORDER, config.featureOrder);
    });

    it("matches the canonical metric-ids list", () => {
      assert.deepEqual(DEFAULT_FEATURE_ORDER, [...METRIC_IDS]);
    });
  });

  describe("DEFAULT_DEGENERACY_ORDER", () => {
    it("matches degeneracy config enabledFlags", async () => {
      const config = await readJson("../../../configs/degeneracy.json");
      assert.deepEqual(DEFAULT_DEGENERACY_ORDER, config.enabledFlags);
    });
  });

  describe("assembleFeatureVector", () => {
    it("orders core metrics, appends extras, and includes degeneracy flags", () => {
      const metrics = [
        { id: "variety", value: 0.4 },
        { id: "agency", value: 0.9 },
        { id: "coverage", value: 0.2 },
      ];
      const degeneracy = { flags: ["forced-move"] };

      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, degeneracy);

      const expectedKeys = [
        ...DEFAULT_FEATURE_ORDER,
        "coverage",
        ...DEFAULT_DEGENERACY_ORDER.map((flag) => `degeneracy.${flag}`),
      ];

      assert.deepEqual(Object.keys(vector), expectedKeys);
      assert.equal(vector.agency, 0.9);
      assert.equal(vector.coverage, 0.2);
      assert.equal(vector["degeneracy.forced-move"], 1);
      assert.equal(vector["degeneracy.loop"], 0);
      assert.equal(vector.strategic_depth, 0);
      assert.deepEqual(nonFiniteKeys, []);
    });

    it("normalizes non-finite metrics and can omit degeneracy", () => {
      const metrics = [{ id: "agency", value: Number.NaN }];
      const degeneracy = { flags: ["loop"] };

      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, degeneracy, { includeDegeneracy: false });

      assert.equal(vector.agency, 0);
      assert.equal(Object.keys(vector).some((key) => key.startsWith("degeneracy.")), false);
      assert.deepEqual(nonFiniteKeys, ["agency"]);
    });

    it("tracks NaN metric as non-finite key", () => {
      const metrics = [{ id: "x", value: NaN }];
      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false, metricOrder: ["x"] });

      assert.equal(vector.x, 0);
      assert.deepEqual(nonFiniteKeys, ["x"]);
    });

    it("does not track finite metric as non-finite key", () => {
      const metrics = [{ id: "x", value: 0.5 }];
      const { nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false, metricOrder: ["x"] });

      assert.ok(!nonFiniteKeys.includes("x"));
    });

    it("tracks Infinity as non-finite and preserves finite keys", () => {
      const metrics = [
        { id: "a", value: Infinity },
        { id: "b", value: 0.5 },
      ];
      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false, metricOrder: ["a", "b"] });

      assert.deepEqual(nonFiniteKeys, ["a"]);
      assert.equal(vector.a, 0);
      assert.equal(vector.b, 0.5);
    });

    it("tracks -Infinity as non-finite", () => {
      const metrics = [{ id: "z", value: -Infinity }];
      const { nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false, metricOrder: ["z"] });

      assert.deepEqual(nonFiniteKeys, ["z"]);
    });

    it("treats undefined metric value as non-finite", () => {
      const metrics = [{ id: "u", value: undefined }];
      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false, metricOrder: ["u"] });

      assert.equal(vector.u, 0);
      assert.deepEqual(nonFiniteKeys, ["u"]);
    });

    it("includes advantage_reversal_rate and policy_sensitivity in default feature order", () => {
      assert.ok(
        DEFAULT_FEATURE_ORDER.includes("advantage_reversal_rate"),
        "DEFAULT_FEATURE_ORDER must include advantage_reversal_rate",
      );
      assert.ok(
        DEFAULT_FEATURE_ORDER.includes("policy_sensitivity"),
        "DEFAULT_FEATURE_ORDER must include policy_sensitivity",
      );
    });

    it("assembles vector with new metrics at correct positions", () => {
      const metrics = [
        { id: "advantage_reversal_rate", value: 0.35 },
        { id: "policy_sensitivity", value: 0.72 },
        { id: "agency", value: 0.5 },
      ];
      const { vector, nonFiniteKeys } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false });

      assert.equal(vector.advantage_reversal_rate, 0.35);
      assert.equal(vector.policy_sensitivity, 0.72);
      assert.equal(vector.agency, 0.5);
      assert.deepEqual(nonFiniteKeys, []);

      const keys = Object.keys(vector);
      const arrIdx = keys.indexOf("advantage_reversal_rate");
      const psIdx = keys.indexOf("policy_sensitivity");
      assert.ok(arrIdx < psIdx, "advantage_reversal_rate must precede policy_sensitivity");
      assert.ok(arrIdx > keys.indexOf("structural_complexity"), "new metrics follow structural_complexity");
    });

    it("new metrics default to zero when absent from input", () => {
      const metrics = [{ id: "agency", value: 0.9 }];
      const { vector } = assembleFeatureVector(metrics, { flags: [] }, { includeDegeneracy: false });

      assert.equal(vector.advantage_reversal_rate, 0);
      assert.equal(vector.policy_sensitivity, 0);
    });

    it("zero-weight fitness entries do not contribute to weighted sum", async () => {
      const fitnessConfig = await readJson("../../../configs/fitness.json");

      assert.equal(fitnessConfig.weights.advantage_reversal_rate, 0);
      assert.equal(fitnessConfig.weights.policy_sensitivity, 0);
    });

    it("includes all 13 degeneracy flags in feature vector", () => {
      const metrics = [{ id: "agency", value: 0.5 }];
      const degeneracy = {
        flags: ["any-cost-abort", "high-skipped-triggers", "high-pass-rate", "high-no-legal-actions-termination"],
      };
      const { vector } = assembleFeatureVector(metrics, degeneracy);

      const degeneracyKeys = Object.keys(vector).filter((k) => k.startsWith("degeneracy."));
      assert.equal(degeneracyKeys.length, 13, `Expected 13 degeneracy keys, got ${degeneracyKeys.length}`);

      assert.equal(vector["degeneracy.any-cost-abort"], 1);
      assert.equal(vector["degeneracy.high-skipped-triggers"], 1);
      assert.equal(vector["degeneracy.high-pass-rate"], 1);
      assert.equal(vector["degeneracy.high-no-legal-actions-termination"], 1);
      assert.equal(vector["degeneracy.high-skipped-effects"], 0);
      assert.equal(vector["degeneracy.loop"], 0);
    });

    it("new degeneracy fitness weights exist in fitness config", async () => {
      const fitnessConfig = await readJson("../../../configs/fitness.json");

      assert.equal(typeof fitnessConfig.weights["degeneracy.high-skipped-effects"], "number");
      assert.equal(typeof fitnessConfig.weights["degeneracy.any-cost-abort"], "number");
      assert.equal(typeof fitnessConfig.weights["degeneracy.high-skipped-triggers"], "number");
      assert.equal(typeof fitnessConfig.weights["degeneracy.high-pass-rate"], "number");
      assert.equal(typeof fitnessConfig.weights["degeneracy.high-no-legal-actions-termination"], "number");
      assert.equal(typeof fitnessConfig.weights["degeneracy.non-finite-metrics"], "number");
    });

    it("non-finite-metrics flag appears in feature vector when present in degeneracy report", () => {
      const metrics = [{ id: "agency", value: 0.5 }];
      const degeneracy = { flags: ["non-finite-metrics"] };
      const { vector } = assembleFeatureVector(metrics, degeneracy);

      assert.equal(vector["degeneracy.non-finite-metrics"], 1);
    });

    it("non-finite-metrics flag is 0 when absent from degeneracy report", () => {
      const metrics = [{ id: "agency", value: 0.5 }];
      const degeneracy = { flags: [] };
      const { vector } = assembleFeatureVector(metrics, degeneracy);

      assert.equal(vector["degeneracy.non-finite-metrics"], 0);
    });

    it("exports policy constants with expected types", () => {
      assert.equal(typeof NON_FINITE_POLICY_MODE, "string");
      assert.ok(["penalize", "reject"].includes(NON_FINITE_POLICY_MODE));
      assert.equal(typeof NON_FINITE_PER_KEY_PENALTY, "number");
      assert.equal(typeof NON_FINITE_MAX_PENALTY, "number");
    });

    it("DEFAULT_DEGENERACY_ORDER contains all 13 flags", () => {
      assert.equal(DEFAULT_DEGENERACY_ORDER.length, 13);
      const expected = [
        "loop", "stalemate", "forced-move", "dominant-action", "trivial-win",
        "no-choices", "non-terminating", "high-skipped-effects", "any-cost-abort",
        "high-skipped-triggers", "high-pass-rate", "high-no-legal-actions-termination",
        "non-finite-metrics",
      ];
      assert.deepEqual(DEFAULT_DEGENERACY_ORDER, expected);
    });
  });

  describe("computeNonFinitePenaltyMultiplier", () => {
    it("returns 1 when count is 0", () => {
      assert.equal(computeNonFinitePenaltyMultiplier(0, 0.05, 0.50), 1);
    });

    it("applies per-key penalty", () => {
      assert.equal(computeNonFinitePenaltyMultiplier(3, 0.05, 0.50), 0.85);
    });

    it("clamps at maxPenalty", () => {
      assert.equal(computeNonFinitePenaltyMultiplier(20, 0.05, 0.50), 0.50);
    });

    it("never returns negative", () => {
      assert.equal(computeNonFinitePenaltyMultiplier(100, 0.5, 1.0), 0);
    });

    it("decreases monotonically with nonFiniteCount", () => {
      let prev = computeNonFinitePenaltyMultiplier(0, 0.05, 0.50);
      for (let i = 1; i <= 10; i++) {
        const curr = computeNonFinitePenaltyMultiplier(i, 0.05, 0.50);
        assert.ok(curr <= prev, `multiplier at count=${i} (${curr}) should be <= at count=${i - 1} (${prev})`);
        prev = curr;
      }
    });

    it("returns 1 for negative count", () => {
      assert.equal(computeNonFinitePenaltyMultiplier(-5, 0.05, 0.50), 1);
    });
  });

  describe("config validation", () => {
    it("configs/metrics-core.json validates against updated schema", async () => {
      const config = await readJson("../../../configs/metrics-core.json");
      assert.equal(typeof config.normalization.nonFinitePolicy, "string");
      assert.ok(["penalize", "reject"].includes(config.normalization.nonFinitePolicy));
      assert.equal(typeof config.normalization.nonFinitePenalty.perKeyPenalty, "number");
      assert.equal(typeof config.normalization.nonFinitePenalty.maxPenalty, "number");
      assert.ok(config.normalization.nonFinitePenalty.perKeyPenalty >= 0);
      assert.ok(config.normalization.nonFinitePenalty.perKeyPenalty <= 1);
      assert.ok(config.normalization.nonFinitePenalty.maxPenalty >= 0);
      assert.ok(config.normalization.nonFinitePenalty.maxPenalty <= 1);
    });
  });
});
