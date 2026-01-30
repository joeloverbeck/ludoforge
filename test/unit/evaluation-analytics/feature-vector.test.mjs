import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_DEGENERACY_ORDER,
  DEFAULT_FEATURE_ORDER,
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
  });
});
