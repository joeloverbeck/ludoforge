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

      const vector = assembleFeatureVector(metrics, degeneracy);

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
    });

    it("normalizes non-finite metrics and can omit degeneracy", () => {
      const metrics = [{ id: "agency", value: Number.NaN }];
      const degeneracy = { flags: ["loop"] };

      const vector = assembleFeatureVector(metrics, degeneracy, { includeDegeneracy: false });

      assert.equal(vector.agency, 0);
      assert.equal(Object.keys(vector).some((key) => key.startsWith("degeneracy.")), false);
    });
  });
});
