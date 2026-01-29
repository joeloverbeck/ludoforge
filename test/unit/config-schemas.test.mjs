import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });

const entries = [
  {
    name: "simulation",
    schema: "simulation.schema.json",
    config: "simulation.json",
  },
  {
    name: "metrics-core",
    schema: "metrics-core.schema.json",
    config: "metrics-core.json",
  },
  {
    name: "metrics-extended",
    schema: "metrics-extended.schema.json",
    config: "metrics-extended.json",
  },
  {
    name: "degeneracy",
    schema: "degeneracy.schema.json",
    config: "degeneracy.json",
  },
  {
    name: "fitness",
    schema: "fitness.schema.json",
    config: "fitness.json",
  },
  {
    name: "preference-model",
    schema: "preference-model.schema.json",
    config: "preference-model.json",
  },
  {
    name: "active-learning",
    schema: "active-learning.schema.json",
    config: "active-learning.json",
  },
  {
    name: "map-elites",
    schema: "map-elites.schema.json",
    config: "map-elites.json",
  },
  {
    name: "evolution-operators",
    schema: "evolution-operators.schema.json",
    config: "evolution-operators.json",
  },
  {
    name: "evolution-runner",
    schema: "evolution-runner.schema.json",
    config: "evolution-runner.json",
  },
  {
    name: "human-feedback",
    schema: "human-feedback.schema.json",
    config: "human-feedback.json",
  },
];

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("config-schemas", () => {
  describe("schema acceptance", () => {
    for (const entry of entries) {
      it(`config schema accepts ${entry.name}`, async () => {
        const schemaJson = await readJson(`../../../schemas/config/${entry.schema}`);
        const configJson = await readJson(`../../../configs/${entry.config}`);
        const validate = ajv.compile(schemaJson);
        const ok = validate(configJson);
        assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
      });
    }
  });

  describe("schema rejection", () => {
    it("simulation schema rejects invalid maxTurns", async () => {
      const schemaJson = await readJson("../../../schemas/config/simulation.schema.json");
      const configJson = await readJson("../../../configs/simulation.json");
      const candidate = structuredClone(configJson);
      candidate.maxTurns = "nope";
      const validate = ajv.compile(schemaJson);
      const ok = validate(candidate);
      assert.equal(ok, false, "Expected schema validation to fail");
    });
  });
});
