import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import { normalizeErrors, compareValidationErrors } from "../validation/error-utils.js";

const schemaPath = new URL(
  "../../schemas/evolution-runner/runner-config.schema.json",
  import.meta.url,
).pathname;
const sharedSchemaPath = new URL(
  "../../schemas/shared/metric-id.schema.json",
  import.meta.url,
).pathname;
const degeneracyPolicySchemaPath = new URL(
  "../../schemas/shared/degeneracy-policy.schema.json",
  import.meta.url,
).pathname;
const schemaJson = JSON.parse(readFileSync(schemaPath, "utf8"));
const sharedSchemaJson = JSON.parse(readFileSync(sharedSchemaPath, "utf8"));
const degeneracyPolicySchemaJson = JSON.parse(readFileSync(degeneracyPolicySchemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(sharedSchemaJson);
ajv.addSchema(degeneracyPolicySchemaJson);
const validate = ajv.compile(schemaJson);

function collectMapElitesErrors(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return errors;
  }
  const mapElites = input.mapElites;
  if (!mapElites || typeof mapElites !== "object") {
    return errors;
  }
  const descriptors = Array.isArray(mapElites.descriptors)
    ? mapElites.descriptors
    : [];
  const seenIds = new Set();

  descriptors.forEach((descriptor, index) => {
    if (!descriptor || typeof descriptor !== "object") {
      return;
    }
    const id = descriptor.id;
    if (typeof id === "string") {
      if (seenIds.has(id)) {
        errors.push({
          path: `/mapElites/descriptors/${index}/id`,
          message: `Descriptor id '${id}' is duplicated`,
          keyword: "descriptor-duplicate-id",
          schemaPath: "",
          params: { id },
        });
      } else {
        seenIds.add(id);
      }
    }
    const min = descriptor.min;
    const max = descriptor.max;
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max <= min
    ) {
      errors.push({
        path: `/mapElites/descriptors/${index}`,
        message: "Descriptor max must be greater than min",
        keyword: "descriptor-range",
        schemaPath: "",
        params: { min, max },
      });
    }
  });

  return errors;
}

export function validateRunnerConfig(input) {
  const valid = validate(input);
  const schemaErrors = valid ? [] : normalizeErrors(validate.errors);
  const structuralErrors = collectMapElitesErrors(input);
  const errors = [...schemaErrors, ...structuralErrors].sort(compareValidationErrors);
  const isValid = Boolean(valid) && structuralErrors.length === 0;
  return {
    valid: isValid,
    errors: isValid ? [] : errors,
  };
}
