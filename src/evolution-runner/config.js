import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";

const schemaPath = new URL(
  "../../schemas/evolution-runner/runner-config.schema.json",
  import.meta.url,
).pathname;
const sharedSchemaPath = new URL(
  "../../schemas/shared/metric-id.schema.json",
  import.meta.url,
).pathname;
const schemaJson = JSON.parse(readFileSync(schemaPath, "utf8"));
const sharedSchemaJson = JSON.parse(readFileSync(sharedSchemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(sharedSchemaJson);
const validate = ajv.compile(schemaJson);

function formatPath(error) {
  const basePath = error.instancePath ?? "";
  if (error.keyword === "required" && error.params?.missingProperty) {
    const missing = error.params.missingProperty;
    return basePath ? `${basePath}/${missing}` : `/${missing}`;
  }
  if (error.keyword === "additionalProperties" && error.params?.additionalProperty) {
    const extra = error.params.additionalProperty;
    return basePath ? `${basePath}/${extra}` : `/${extra}`;
  }
  return basePath;
}

function normalizeErrors(errors) {
  if (!errors) {
    return [];
  }

  return errors
    .map((error) => ({
      path: formatPath(error),
      message: error.message ?? "Invalid value",
      keyword: error.keyword,
      schemaPath: error.schemaPath ?? "",
      params: error.params ?? {},
    }))
    .sort(compareValidationErrors);
}

function compareValidationErrors(left, right) {
  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }
  if (left.keyword !== right.keyword) {
    return left.keyword < right.keyword ? -1 : 1;
  }
  if (left.schemaPath !== right.schemaPath) {
    return left.schemaPath < right.schemaPath ? -1 : 1;
  }
  if (left.message !== right.message) {
    return left.message < right.message ? -1 : 1;
  }
  const leftParams = JSON.stringify(left.params);
  const rightParams = JSON.stringify(right.params);
  if (leftParams !== rightParams) {
    return leftParams < rightParams ? -1 : 1;
  }
  return 0;
}

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
