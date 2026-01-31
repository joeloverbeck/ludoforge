import { createEvaluator } from "../evaluation-analytics/create-evaluator.js";
import { createConsoleIO } from "./console-io.js";
import { createFeedbackProvider } from "../human-interface/create-feedback-provider.js";

/**
 * @param {object} runnerOptions
 * @param {object} config
 * @param {Function} runEvolutionRunnerFn
 * @returns {Promise<object>}
 */
async function executeRunnerWithFeedback(runnerOptions, config, runEvolutionRunnerFn) {
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
    return await runEvolutionRunnerFn(runnerOptions);
  } finally {
    if (consoleIO) {
      consoleIO.close();
    }
  }
}

/**
 * Creates the evaluator, optionally writes metadata, runs evolution, and reports completion.
 *
 * @param {{
 *   baseDir: string,
 *   runId: string,
 *   config: object,
 *   descriptorKeys: string[],
 *   logger: object,
 *   reporter: { onRunComplete: Function },
 *   deps: { writeRunMetadata: Function, runEvolutionRunner: Function },
 *   population?: object[],
 *   startGeneration?: number,
 *   preferenceModelSnapshots?: object[],
 *   writeMetadata: boolean,
 *   resumed: boolean,
 * }} options
 * @returns {Promise<{ runId: string, baseDir: string, dryRun: false, resumed: boolean, result: object }>}
 */
export async function executeAndReport({
  baseDir, runId, config, descriptorKeys, logger, reporter, deps,
  population, startGeneration, preferenceModelSnapshots,
  writeMetadata, resumed,
}) {
  const evaluation = createEvaluator({ descriptorKeys });

  if (writeMetadata) {
    await deps.writeRunMetadata(baseDir, runId, { config });
  }

  const runnerOptions = {
    baseDir,
    runId,
    config,
    evaluation,
    logger,
  };

  if (population !== undefined) {
    runnerOptions.population = population;
  }
  if (startGeneration !== undefined) {
    runnerOptions.startGeneration = startGeneration;
  }
  if (preferenceModelSnapshots !== undefined) {
    runnerOptions.preferenceModelSnapshots = preferenceModelSnapshots;
  }

  const result = await executeRunnerWithFeedback(runnerOptions, config, deps.runEvolutionRunner);

  reporter.onRunComplete({
    runId,
    generationsCompleted: result.generations.length,
    halted: !!result.haltedReason,
  });

  return {
    runId,
    baseDir,
    dryRun: false,
    resumed,
    result,
  };
}
