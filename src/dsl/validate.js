import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import { normalizeErrors, compareValidationErrors } from "../validation/error-utils.js";

const schemaPath = new URL(
  "../../schemas/dsl/game-definition.v1.json",
  import.meta.url
).pathname;
const schemaJson = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

function collectStructuralErrors(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return errors;
  }
  const termination = input.termination;
  if (!termination || typeof termination !== "object") {
    return errors;
  }
  const conditions = Array.isArray(termination.conditions) ? termination.conditions : [];
  if (conditions.length === 0) {
    errors.push({
      path: "/termination/conditions",
      message: "At least one termination condition is required",
      keyword: "termination-conditions",
      schemaPath: "",
      params: {},
    });
  }
  if (typeof termination.maxTurns !== "number") {
    errors.push({
      path: "/termination/maxTurns",
      message: "A maxTurns fallback is required",
      keyword: "termination-max-turns",
      schemaPath: "",
      params: {},
    });
  }
  return errors;
}

export function validateGameDefinition(input) {
  const valid = validate(input);
  const schemaErrors = valid ? [] : normalizeErrors(validate.errors);
  const structuralErrors = collectStructuralErrors(input);
  const errors = [...schemaErrors, ...structuralErrors].sort(compareValidationErrors);
  const isValid = Boolean(valid) && structuralErrors.length === 0;
  return {
    valid: isValid,
    errors: isValid ? [] : errors,
  };
}
