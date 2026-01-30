import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

import { createConfigFingerprint, normalizeConfig } from "./fingerprint.js";
import { validateConfig } from "./validator.js";

const DEFAULT_CONFIG_DIR = new URL("../../configs/", import.meta.url);
const DEFAULT_SCHEMA_DIR = new URL("../../schemas/config/", import.meta.url);

export const DEFAULT_CONFIG_ENTRIES = [
  {
    name: "simulation",
    file: "simulation.json",
    schema: "simulation.schema.json",
  },
  {
    name: "metrics-core",
    file: "metrics-core.json",
    schema: "metrics-core.schema.json",
  },
  {
    name: "metrics-extended",
    file: "metrics-extended.json",
    schema: "metrics-extended.schema.json",
  },
  {
    name: "degeneracy",
    file: "degeneracy.json",
    schema: "degeneracy.schema.json",
  },
  {
    name: "fitness",
    file: "fitness.json",
    schema: "fitness.schema.json",
  },
  {
    name: "preference-model",
    file: "preference-model.json",
    schema: "preference-model.schema.json",
  },
  {
    name: "active-learning",
    file: "active-learning.json",
    schema: "active-learning.schema.json",
  },
  {
    name: "map-elites",
    file: "map-elites.json",
    schema: "map-elites.schema.json",
  },
  {
    name: "evolution-operators",
    file: "evolution-operators.json",
    schema: "evolution-operators.schema.json",
  },
  {
    name: "evolution-runner",
    file: "evolution-runner.json",
    schema: "evolution-runner.schema.json",
  },
  {
    name: "human-feedback",
    file: "human-feedback.json",
    schema: "human-feedback.schema.json",
  },
  {
    name: "agent-suites",
    file: "agent-suites.json",
    schema: "agent-suites.schema.json",
  },
];

function resolveDirUrl(input, fallback) {
  if (!input) {
    return fallback;
  }
  if (input instanceof URL) {
    return input;
  }
  const absolute = resolvePath(String(input));
  const withSlash = absolute.endsWith("/") ? absolute : `${absolute}/`;
  return pathToFileURL(withSlash);
}

function buildParseError(message, filePath) {
  return {
    path: "",
    message: `Invalid JSON: ${message}`,
    keyword: "parse",
    schemaPath: "",
    params: { file: filePath },
  };
}

async function readJsonFile(fileUrl) {
  let raw;
  try {
    raw = await readFile(fileUrl, "utf8");
  } catch (error) {
    throw error;
  }

  try {
    return { value: JSON.parse(raw), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return {
      value: null,
      error: buildParseError(message, fileUrl.pathname ?? fileUrl.toString()),
    };
  }
}

function resolveFileUrl(baseUrl, filename) {
  return new URL(filename, baseUrl);
}

export async function loadConfigFile({ name, file, schema, configDir, schemaDir }) {
  if (!name) {
    throw new Error("Config name is required");
  }
  const configBaseUrl = resolveDirUrl(configDir, DEFAULT_CONFIG_DIR);
  const schemaBaseUrl = resolveDirUrl(schemaDir, DEFAULT_SCHEMA_DIR);
  const configFile = file ?? `${name}.json`;
  const schemaFile = schema ?? `${name}.schema.json`;

  const configUrl = resolveFileUrl(configBaseUrl, configFile);
  const schemaUrl = resolveFileUrl(schemaBaseUrl, schemaFile);

  const configResult = await readJsonFile(configUrl);
  if (configResult.error) {
    return {
      name,
      config: null,
      valid: false,
      errors: [configResult.error],
    };
  }

  const validation = await validateConfig(configResult.value, schemaUrl);
  if (!validation.valid) {
    return {
      name,
      config: null,
      valid: false,
      errors: validation.errors,
    };
  }

  return {
    name,
    config: normalizeConfig(configResult.value),
    valid: true,
    errors: [],
  };
}

function prefixErrors(name, errors) {
  const prefix = `/${name}`;
  return errors.map((error) => ({
    ...error,
    path: error.path ? `${prefix}${error.path}` : prefix,
  }));
}

export async function loadConfigSet({ entries = DEFAULT_CONFIG_ENTRIES, configDir, schemaDir } = {}) {
  const resolved = {};
  const versions = {};
  const errors = [];

  for (const entry of entries) {
    const result = await loadConfigFile({
      name: entry.name,
      file: entry.file,
      schema: entry.schema,
      configDir,
      schemaDir,
    });

    if (!result.valid) {
      errors.push(...prefixErrors(entry.name, result.errors));
      continue;
    }

    resolved[entry.name] = result.config;
    const version = result.config?.version;
    versions[entry.name] = typeof version === "number" ? version : null;
  }

  const normalized = normalizeConfig(resolved);
  const valid = errors.length === 0;

  return {
    valid,
    errors,
    config: normalized,
    configVersion: valid
      ? {
          versions,
          fingerprint: createConfigFingerprint(normalized),
        }
      : null,
  };
}
