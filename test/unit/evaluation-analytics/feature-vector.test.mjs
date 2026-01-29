import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  DEFAULT_DEGENERACY_ORDER,
  DEFAULT_FEATURE_ORDER,
  assembleFeatureVector,
} from "../../../src/evaluation-analytics/feature-vector.js";

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

    it("matches the expected metric ordering", () => {
      assert.deepEqual(DEFAULT_FEATURE_ORDER, [
        "agency",
        "strategic_depth",
        "seat_imbalance",
        "variety",
        "pacing_tension",
        "turn_taking_rate",
        "interaction_rate",
      ]);
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
  });
});
