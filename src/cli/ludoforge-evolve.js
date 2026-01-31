#!/usr/bin/env node
import { writeSync } from "node:fs";
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
import { CLIError } from "./cli-error.js";
import { parseArgs } from "./parse-args.js";
import { loadConfig } from "./load-config.js";
import { createUsage } from "./usage.js";
import { validateDescriptorKeys } from "./validate-descriptor-keys.js";
import { createLogger } from "./create-logger.js";
import { createProgressReporter } from "./create-progress-reporter.js";
import { resolveRunId } from "./resolve-run-id.js";
import { executeAndReport } from "./execute-and-report.js";

function resolveDeps(overrides = {}) {
  return {
    readFile,
    validateRunnerConfig,
    assertValidRunId,
    listRuns,
    createRunId,
    writeRunMetadata,
    loadSeedPopulation,
    loadResumeState,
    runEvolutionRunner,
    ...overrides,
  };
}

function resolveLoggerOptions(parsed) {
  if (parsed.quiet) {
    return { level: "error", pretty: false };
  }
  if (parsed.verbose) {
    return { level: "debug", pretty: true };
  }
  return { level: process.env.LOG_LEVEL ?? "info", pretty: false };
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

  const loggerOpts = resolveLoggerOptions(parsed);
  const logger = createLogger(loggerOpts);
  const reporter = createProgressReporter({ silent: parsed.quiet });

  const config = await loadConfig(parsed.config, deps);

  const descriptorKeys = config.mapElites.descriptors.map((d) => d.id);
  const descriptorValidation = validateDescriptorKeys(descriptorKeys);
  if (!descriptorValidation.valid) {
    throw new CLIError(
      `Unknown MAP-Elites descriptor ID(s): ${descriptorValidation.unknownIds.join(", ")}`,
      {
        hint: `Valid descriptor IDs are: ${descriptorValidation.availableMetrics.join(", ")}`,
      },
    );
  }

  const baseDir = parsed.out ? resolve(parsed.out) : process.cwd();
  const { runId } = await resolveRunId({ parsed, baseDir, deps });

  const shared = { baseDir, runId, config, descriptorKeys, logger, reporter, deps };

  if (parsed.resume) {
    const resumeState = await deps.loadResumeState({ baseDir, runId, config });
    if (parsed.dryRun) {
      return { runId, baseDir, dryRun: true, resumed: true };
    }
    return executeAndReport({
      ...shared,
      population: resumeState.population,
      startGeneration: resumeState.generation + 1,
      preferenceModelSnapshots: [resumeState.preferenceModel],
      writeMetadata: false,
      resumed: true,
    });
  }

  if (parsed.seeds) {
    const population = await deps.loadSeedPopulation(parsed.seeds);
    if (parsed.dryRun) {
      return { runId, baseDir, dryRun: true, resumed: false, populationSize: population.length };
    }
    return executeAndReport({
      ...shared,
      population,
      writeMetadata: true,
      resumed: false,
    });
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

  return executeAndReport({
    ...shared,
    writeMetadata: true,
    resumed: false,
  });
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
    const parts = [`Error: ${message}`];
    if (error instanceof CLIError) {
      if (error.hint) {
        parts.push("", `Hint: ${error.hint}`);
      }
      if (error.showUsage) {
        parts.push("", createUsage());
      }
    }
    const output = `${parts.join("\n")}\n`;
    try {
      writeSync(2, output);
    } catch {
      process.stderr.write(output);
    }
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void main();
}
