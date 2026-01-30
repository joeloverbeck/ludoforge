import { CLIError } from "./cli-error.js";

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      return `${path}: ${error.message}`;
    })
    .join("\n");
}

export async function loadConfig(configPath, deps) {
  if (!configPath) {
    throw new CLIError(
      "Missing required --config <path>. The config file specifies evolution parameters (generations, MAP-Elites settings, etc.).",
      {
        showUsage: true,
        hint: "See configs/ for example config files.",
      },
    );
  }
  let raw;
  try {
    raw = await deps.readFile(configPath, "utf8");
  } catch {
    throw new CLIError(
      `Failed to read config at ${configPath}`,
      { hint: "Check that the file exists and the path is correct." },
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CLIError(
      `Invalid JSON in config at ${configPath}`,
      { hint: "Validate your JSON with a linter or jsonlint." },
    );
  }

  const validation = deps.validateRunnerConfig(parsed);
  if (!validation.valid) {
    throw new CLIError(
      `Runner config validation failed:\n${formatValidationErrors(validation.errors)}`,
      { hint: "See schemas/config/ for the expected structure." },
    );
  }

  return parsed;
}
