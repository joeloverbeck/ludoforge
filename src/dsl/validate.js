import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";

const schemaPath = new URL(
  "../../schemas/dsl/game-definition.v1.json",
  import.meta.url
).pathname;
const schemaJson = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
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
    .sort((left, right) => {
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
    });
}

export function validateGameDefinition(input) {
  const valid = validate(input);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : normalizeErrors(validate.errors),
  };
}
