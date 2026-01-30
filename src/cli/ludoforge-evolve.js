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
import { parseArgs } from "./parse-args.js";
import { loadConfig } from "./load-config.js";
import { createUsage } from "./usage.js";
import { validateDescriptorKeys } from "./validate-descriptor-keys.js";
import { createConsoleIO } from "./console-io.js";
import { createFeedbackProvider } from "../human-interface/create-feedback-provider.js";

async function executeRunnerWithFeedback(runnerOptions, config, runEvolutionRunner) {
  let consoleIO;
  try {
    if (config.humanFeedback?.enabled) {
      consoleIO = createConsoleIO();
      const provider = createFeedbackProvider({
        io: consoleIO.io,
        config: config.humanFeedback,
        initialModelState: runnerOptions.preferenceModelSnapshots?.[0],
        seed: config.seed,
      });
      runnerOptions.feedback = provider.feedbackProvider;
      runnerOptions.preferenceModelSnapshots = provider.snapshotProvider;
    }
    return await runEvolutionRunner(runnerOptions);
  } finally {
    if (consoleIO) {
      consoleIO.close();
    }
  }
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

    const evaluation = createEvaluator({ descriptorKeys });

    const runnerOptions = {
      baseDir,
      runId,
      config,
      population: resumeState.population,
      startGeneration: resumeState.generation + 1,
      preferenceModelSnapshots: [resumeState.preferenceModel],
      evaluation,
    };

    const result = await executeRunnerWithFeedback(runnerOptions, config, deps.runEvolutionRunner);

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

    const evaluation = createEvaluator({ descriptorKeys });
    await deps.writeRunMetadata(baseDir, runId, { config });

    const runnerOptions = {
      baseDir,
      runId,
      config,
      population,
      evaluation,
    };

    const result = await executeRunnerWithFeedback(runnerOptions, config, deps.runEvolutionRunner);

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

  const evaluation = createEvaluator({ descriptorKeys });
  await deps.writeRunMetadata(baseDir, runId, { config });

  const runnerOptions = {
    baseDir,
    runId,
    config,
    evaluation,
  };

  const result = await executeRunnerWithFeedback(runnerOptions, config, deps.runEvolutionRunner);

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

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  void main();
}
