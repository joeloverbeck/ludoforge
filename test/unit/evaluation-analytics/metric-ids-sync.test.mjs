import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import { METRIC_IDS } from "../../../src/evaluation-analytics/metric-ids.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function extractEnum(schema, defsKey, propName) {
  const def = schema.$defs?.[defsKey];
  return def?.properties?.[propName]?.enum ?? null;
}

describe("metric-ids sync check", () => {
  it("METRIC_IDS matches schemas/shared/metric-ids.json", async () => {
    const canonical = await readJson(
      "../../../schemas/shared/metric-ids.json",
    );
    assert.deepEqual([...METRIC_IDS], canonical);
  });

  it("map-elites schema enum matches canonical list", async () => {
    const schema = await readJson(
      "../../../schemas/config/map-elites.schema.json",
    );
    const enumValues = extractEnum(schema, "DescriptorConfig", "id");
    assert.deepEqual(enumValues, [...METRIC_IDS]);
  });

  it("runner-config schema enum matches canonical list", async () => {
    const schema = await readJson(
      "../../../schemas/evolution-runner/runner-config.schema.json",
    );
    const enumValues = extractEnum(
      schema,
      "MapElitesDescriptorConfig",
      "id",
    );
    assert.deepEqual(enumValues, [...METRIC_IDS]);
  });

  it("metrics-core config enabled list matches canonical list", async () => {
    const config = await readJson("../../../configs/metrics-core.json");
    assert.deepEqual(config.enabled, [...METRIC_IDS]);
  });

  it("metrics-core config featureOrder matches canonical list", async () => {
    const config = await readJson("../../../configs/metrics-core.json");
    assert.deepEqual(config.featureOrder, [...METRIC_IDS]);
  });
});
