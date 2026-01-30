/**
 * Shared validation error utilities used by DSL, config, and runner validators.
 *
 * @module validation/error-utils
 */

/**
 * @param {import("ajv").ErrorObject} error
 * @returns {string}
 */
export function formatPath(error) {
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

/**
 * @param {{ path: string, keyword: string, schemaPath: string, message: string, params: object }} left
 * @param {{ path: string, keyword: string, schemaPath: string, message: string, params: object }} right
 * @returns {number}
 */
export function compareValidationErrors(left, right) {
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

/**
 * @param {import("ajv").ErrorObject[] | null | undefined} errors
 * @returns {Array<{ path: string, message: string, keyword: string, schemaPath: string, params: object }>}
 */
export function normalizeErrors(errors) {
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
