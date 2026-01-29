#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertValidRunId,
  createRunId,
  listRuns,
  writeRunMetadata,
} from "../evolution-runner/run-layout.js";
import { loadSeedPopulation } from "../evolution-runner/seed-loader.js";
import { loadResumeState } from "../evolution-runner/resume-loader.js";
import { runEvolutionRunner } from "../evolution-runner/runner.js";
import { validateRunnerConfig } from "../evolution-runner/config.js";
import { createEvaluator } from "../evaluation-analytics/create-evaluator.js";
import { CLIError } from "./cli-error.js";

const VALUE_FLAGS = new Set(["--seeds", "--config", "--run-id", "--out"]);
const BOOLEAN_FLAGS = new Set(["--dry-run", "--resume", "--help", "-h"]);
const ALL_FLAGS = new Set([...VALUE_FLAGS, ...BOOLEAN_FLAGS]);

function validFlagList() {
  return [...ALL_FLAGS].sort().join(", ");
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  const parsed = {
    dryRun: false,
    resume: false,
    help: false,
    _hasArgs: args.length > 0,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--resume") {
      parsed.resume = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const [flag, inlineValue] = arg.split("=", 2);
      if (!VALUE_FLAGS.has(flag)) {
        throw new CLIError(
          `Unknown flag: ${flag}. Valid flags are: ${validFlagList()}`,
          { showUsage: true },
        );
      }
      const value = inlineValue ?? args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new CLIError(
          `${flag} requires a value. Example: ${flag} <value>`,
          { showUsage: true },
        );
      }
      i += inlineValue ? 0 : 1;
      if (flag === "--seeds") {
        parsed.seeds = value;
      } else if (flag === "--config") {
        parsed.config = value;
      } else if (flag === "--run-id") {
        parsed.runId = value;
      } else if (flag === "--out") {
        parsed.out = value;
      }
      continue;
    }

    throw new CLIError(
      `Unexpected argument: ${arg}. Only flags (--flag) are accepted, not positional arguments.`,
      { showUsage: true },
    );
  }

  return parsed;
}

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

async function loadConfig(configPath, deps) {
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

function createUsage() {
  return [
    "Usage: ludoforge-evolve --config <path> [--seeds <path>] [options]",
    "",
    "Required:",
    "  --config <path>    Path to runner config JSON",
    "",
    "Options:",
    "  --seeds <path>     Path to seed population JSON or JSONL (overrides config seeding)",
    "  --run-id <id>      Explicit run ID (UUID)",
    "  --resume           Resume an existing run (requires --run-id)",
    "  --out <dir>        Base output directory (default: cwd)",
    "  --dry-run          Validate inputs without executing the runner",
    "  --help             Show this help",
  ].join("\n");
}

function resolveDeps(overrides = {}) {
  return {
    readFile,
    validateRunnerConfig,
    listRuns,
    createRunId,
    writeRunMetadata,
    loadSeedPopulation,
    loadResumeState,
    runEvolutionRunner,
    ...overrides,
  };
}

function formatRunList(runs) {
  if (runs.length === 0) {
    return "No runs found in this directory.";
  }
  return `Available runs: ${runs.join(", ")}`;
}

export async function runLudoforgeEvolve({ argv = process.argv, deps: overrides } = {}) {
  const deps = resolveDeps(overrides);
  const parsed = parseArgs(argv);

  if (parsed.help) {
    return { help: true, message: createUsage() };
  }

  if (!parsed._hasArgs) {
    throw new CLIError("No arguments provided.", {
      showUsage: true,
      hint: "At minimum, pass --config <path> to specify the runner config file.",
    });
  }

  const config = await loadConfig(parsed.config, deps);
  const baseDir = parsed.out ? resolve(parsed.out) : process.cwd();

  const existingRuns = await deps.listRuns(baseDir);
  let runId = parsed.runId;

  if (parsed.resume) {
    if (!runId) {
      throw new CLIError(
        "--resume requires --run-id <id> to identify which run to continue.",
        { showUsage: true },
      );
    }
    try {
      assertValidRunId(runId);
    } catch {
      throw new CLIError(
        `Invalid run ID format: '${runId}'.`,
        { hint: "Run IDs must be UUIDs, e.g. 123e4567-e89b-42d3-a456-426614174000" },
      );
    }
    if (!existingRuns.includes(runId)) {
      throw new CLIError(
        `Run ID '${runId}' does not exist in ${baseDir}.`,
        { hint: formatRunList(existingRuns) },
      );
    }

    const resumeState = await deps.loadResumeState({ baseDir, runId, config });
    if (parsed.dryRun) {
      return {
        runId,
        baseDir,
        dryRun: true,
        resumed: true,
      };
    }

    const evaluation = createEvaluator();

    const result = await deps.runEvolutionRunner({
      baseDir,
      runId,
      config,
      population: resumeState.population,
      startGeneration: resumeState.generation + 1,
      preferenceModelSnapshots: [resumeState.preferenceModel],
      evaluation,
    });

    return {
      runId,
      baseDir,
      dryRun: false,
      resumed: true,
      result,
    };
  }

  if (runId) {
    try {
      assertValidRunId(runId);
    } catch {
      throw new CLIError(
        `Invalid run ID format: '${runId}'.`,
        { hint: "Run IDs must be UUIDs, e.g. 123e4567-e89b-42d3-a456-426614174000" },
      );
    }
    if (existingRuns.includes(runId)) {
      throw new CLIError(
        `Run ID '${runId}' already exists in ${baseDir}.`,
        { hint: "Use --resume --run-id <id> to continue an existing run, or omit --run-id to auto-generate a new one." },
      );
    }
  } else {
    runId = deps.createRunId();
  }

  if (parsed.seeds) {
    const population = await deps.loadSeedPopulation(parsed.seeds);
    if (parsed.dryRun) {
      return {
        runId,
        baseDir,
        dryRun: true,
        resumed: false,
        populationSize: population.length,
      };
    }

    const evaluation = createEvaluator();
    await deps.writeRunMetadata(baseDir, runId, { config });

    const result = await deps.runEvolutionRunner({
      baseDir,
      runId,
      config,
      population,
      evaluation,
    });

    return {
      runId,
      baseDir,
      dryRun: false,
      resumed: false,
      result,
    };
  }

  if (!config.seeding) {
    throw new CLIError(
      "Missing --seeds <path> and no seeding block in config. " +
      "Provide --seeds or add a seeding block to your runner config.",
      {
        showUsage: true,
        hint: "Seeds define the initial population of game definitions to evolve.",
      },
    );
  }

  if (parsed.dryRun) {
    return {
      runId,
      baseDir,
      dryRun: true,
      resumed: false,
      populationSize: config.seeding.populationSize,
    };
  }

  const evaluation = createEvaluator();
  await deps.writeRunMetadata(baseDir, runId, { config });

  const result = await deps.runEvolutionRunner({
    baseDir,
    runId,
    config,
    evaluation,
  });

  return {
    runId,
    baseDir,
    dryRun: false,
    resumed: false,
    result,
  };
}

async function main() {
  try {
    const result = await runLudoforgeEvolve({ argv: process.argv });
    if (result?.help) {
      process.stdout.write(`${result.message}\n`);
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const parts = [message];
    if (error instanceof CLIError) {
      if (error.hint) {
        parts.push("", `Hint: ${error.hint}`);
      }
      if (error.showUsage) {
        parts.push("", createUsage());
      }
    }
    process.stderr.write(`${parts.join("\n")}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
