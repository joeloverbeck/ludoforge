import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validatorCache = new Map();

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

async function loadSchema(schemaUrl) {
  const raw = await readFile(schemaUrl, "utf8");
  return JSON.parse(raw);
}

async function getValidator(schemaUrl) {
  const key = schemaUrl.toString();
  if (validatorCache.has(key)) {
    return validatorCache.get(key);
  }
  const schemaJson = await loadSchema(schemaUrl);
  const validate = ajv.compile(schemaJson);
  validatorCache.set(key, validate);
  return validate;
}

export async function validateConfig(input, schemaUrl) {
  const validate = await getValidator(schemaUrl);
  const valid = validate(input);
  const errors = valid ? [] : normalizeErrors(validate.errors);
  return {
    valid: Boolean(valid),
    errors,
  };
}
