import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import { METRIC_IDS } from "../../../src/evaluation-analytics/metric-ids.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function extractRef(schema, defsKey, propName) {
  const def = schema.$defs?.[defsKey];
  const prop = def?.properties?.[propName];
  if (!prop) {
    return null;
  }
  if (typeof prop.$ref === "string") {
    return prop.$ref;
  }
  if (Array.isArray(prop.allOf) && typeof prop.allOf[0]?.$ref === "string") {
    return prop.allOf[0].$ref;
  }
  return null;
}

describe("metric-ids sync check", () => {
  it("METRIC_IDS matches schemas/shared/metric-id.schema.json enum", async () => {
    const canonical = await readJson(
      "../../../schemas/shared/metric-id.schema.json",
    );
    assert.deepEqual([...METRIC_IDS], canonical.enum);
  });

  it("map-elites schema references shared metric id schema", async () => {
    const schema = await readJson(
      "../../../schemas/config/map-elites.schema.json",
    );
    const ref = extractRef(schema, "DescriptorConfig", "id");
    assert.equal(
      ref,
      "https://ludoforge.dev/schemas/shared/metric-id.schema.json",
    );
  });

  it("runner-config schema references shared metric id schema", async () => {
    const schema = await readJson(
      "../../../schemas/evolution-runner/runner-config.schema.json",
    );
    const ref = extractRef(
      schema,
      "MapElitesDescriptorConfig",
      "id",
    );
    assert.equal(
      ref,
      "https://ludoforge.dev/schemas/shared/metric-id.schema.json",
    );
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
