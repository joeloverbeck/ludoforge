import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import { normalizeErrors } from "../validation/error-utils.js";

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validatorCache = new Map();
let sharedSchemasPromise = null;

const SHARED_SCHEMAS = [
  new URL("../../schemas/shared/metric-id.schema.json", import.meta.url),
  new URL("../../schemas/shared/agent-descriptor.schema.json", import.meta.url),
  new URL("../../schemas/shared/degeneracy-policy.schema.json", import.meta.url),
];

async function loadSchema(schemaUrl) {
  const raw = await readFile(schemaUrl, "utf8");
  return JSON.parse(raw);
}

async function getValidator(schemaUrl) {
  const key = schemaUrl.toString();
  if (validatorCache.has(key)) {
    return validatorCache.get(key);
  }
  if (!sharedSchemasPromise) {
    sharedSchemasPromise = (async () => {
      for (const url of SHARED_SCHEMAS) {
        const schema = await loadSchema(url);
        const schemaId = schema.$id ?? url.toString();
        if (!ajv.getSchema(schemaId)) {
          ajv.addSchema(schema);
        }
      }
    })();
  }
  await sharedSchemasPromise;
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
