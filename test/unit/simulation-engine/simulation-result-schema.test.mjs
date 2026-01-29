import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

const schemaJson = JSON.parse(
  await readFile(
    new URL("../../../schemas/simulation-engine/simulation-result.schema.json", import.meta.url)
  )
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

function assertValid(result) {
  const ok = validate(result);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(result) {
  const ok = validate(result);
  assert.equal(ok, false, "Expected schema validation to fail");
}

function buildMaxTurnResult() {
  const definition = createBaseDefinition();
  definition.actions = [createIncrementAction()];
  definition.termination.conditions = [];

  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
    maxTurns: 1,
  });

  return engine.run();
}

describe("simulation-result-schema", () => {
  describe("schema validation", () => {
    it("SimulationResult validates against the schema", () => {
      const result = buildMaxTurnResult();
      assertValid(result);
    });

    it("rejects outcome.reason", () => {
      const result = buildMaxTurnResult();
      const candidate = structuredClone(result);
      candidate.outcome.reason = "max-turns";
      assertInvalid(candidate);
    });
  });

  describe("required fields", () => {
    it("rejects steps missing affected fields", () => {
      const result = buildMaxTurnResult();
      const missingIds = structuredClone(result);
      delete missingIds.trajectory.steps[0].affectedPlayerIds;
      assertInvalid(missingIds);

      const missingGlobal = structuredClone(result);
      delete missingGlobal.trajectory.steps[0].affectedGlobal;
      assertInvalid(missingGlobal);
    });
  });
});
