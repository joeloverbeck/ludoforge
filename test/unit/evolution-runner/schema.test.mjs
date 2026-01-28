import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const schemaJson = JSON.parse(
  await readFile(
    new URL("../../../schemas/evolution-runner/runner-config.v1.json", import.meta.url),
  ),
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

const baseConfig = {
  version: "v1",
  runner: { generations: 2 },
  mapElites: {
    descriptors: [{ id: "balance", min: 0, max: 1, bins: 4 }],
  },
};

function cloneConfig(config) {
  return structuredClone(config);
}

function assertValid(config) {
  const ok = validate(config);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(config) {
  const ok = validate(config);
  assert.equal(ok, false, "Expected schema validation to fail");
}

test("accepts a minimal runner config", () => {
  assertValid(cloneConfig(baseConfig));
});

test("rejects missing required sections", () => {
  const candidate = cloneConfig(baseConfig);
  delete candidate.mapElites;
  assertInvalid(candidate);
});
