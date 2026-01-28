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

const VALUE_FLAGS = new Set(["--seeds", "--config", "--run-id", "--out", "--evaluator"]);

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  const parsed = {
    dryRun: false,
    resume: false,
    help: false,
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
        throw new Error(`Unknown flag: ${flag}`);
      }
      const value = inlineValue ?? args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${flag}`);
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
      } else if (flag === "--evaluator") {
        parsed.evaluator = value;
      }
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
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
    throw new Error("Missing required --config <path>");
  }
  let raw;
  try {
    raw = await deps.readFile(configPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read config at ${configPath}: ${message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Invalid JSON in config at ${configPath}: ${message}`);
  }

  const validation = deps.validateRunnerConfig(parsed);
  if (!validation.valid) {
    throw new Error(`Runner config validation failed:\n${formatValidationErrors(validation.errors)}`);
  }

  return parsed;
}

async function loadEvaluator(modulePath, deps) {
  if (!modulePath) {
    throw new Error("Missing required --evaluator <path> for non-dry-run execution");
  }

  const resolved = resolve(modulePath);
  const moduleUrl = pathToFileURL(resolved).href;
  const moduleExports = await deps.loadEvaluatorModule(moduleUrl);
  if (!moduleExports || typeof moduleExports !== "object") {
    throw new Error("Evaluator module did not export an object");
  }

  if (typeof moduleExports.createEvaluation === "function") {
    const evaluation = moduleExports.createEvaluation();
    if (!evaluation || typeof evaluation.evaluator !== "function") {
      throw new Error("createEvaluation must return an evaluation object with an evaluator function");
    }
    return evaluation;
  }

  if (typeof moduleExports.evaluator === "function") {
    return { evaluator: moduleExports.evaluator };
  }

  if (typeof moduleExports.default === "function") {
    return { evaluator: moduleExports.default };
  }

  if (moduleExports.evaluation && typeof moduleExports.evaluation.evaluator === "function") {
    return moduleExports.evaluation;
  }

  throw new Error(
    "Evaluator module must export an evaluator function or createEvaluation() factory",
  );
}

function createUsage() {
  return [
    "Usage: ludoforge-evolve --config <path> --seeds <path> [options]",
    "",
    "Required:",
    "  --config <path>    Path to runner config JSON",
    "  --seeds <path>     Path to seed population JSON or JSONL",
    "",
    "Options:",
    "  --run-id <id>      Explicit run ID (UUID)",
    "  --resume           Resume an existing run (requires --run-id)",
    "  --out <dir>        Base output directory (default: cwd)",
    "  --evaluator <path> Path to evaluator module (required unless --dry-run)",
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
    loadEvaluatorModule: (moduleUrl) => import(moduleUrl),
    ...overrides,
  };
}

export async function runLudoforgeEvolve({ argv = process.argv, deps: overrides } = {}) {
  const deps = resolveDeps(overrides);
  const parsed = parseArgs(argv);

  if (parsed.help) {
    return { help: true, message: createUsage() };
  }

  const config = await loadConfig(parsed.config, deps);
  const baseDir = parsed.out ? resolve(parsed.out) : process.cwd();

  const existingRuns = await deps.listRuns(baseDir);
  let runId = parsed.runId;

  if (parsed.resume) {
    if (!runId) {
      throw new Error("--resume requires --run-id <id>");
    }
    assertValidRunId(runId);
    if (!existingRuns.includes(runId)) {
      throw new Error(`Run ID '${runId}' does not exist in ${baseDir}`);
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

    const evaluation = await loadEvaluator(parsed.evaluator, deps);

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
    assertValidRunId(runId);
    if (existingRuns.includes(runId)) {
      throw new Error(`Run ID '${runId}' already exists in ${baseDir}`);
    }
  } else {
    runId = deps.createRunId();
  }

  if (!parsed.seeds) {
    throw new Error("Missing required --seeds <path>");
  }

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

  const evaluation = await loadEvaluator(parsed.evaluator, deps);
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

async function main() {
  try {
    const result = await runLudoforgeEvolve({ argv: process.argv });
    if (result?.help) {
      process.stdout.write(`${result.message}\n`);
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
