/**
 * Validates the top-level options object passed to `runEvolutionRunner`.
 *
 * @param {object} options
 * @throws {Error} when any required option is missing or malformed
 */
export function validateRunnerOptions(options) {
  if (!options || typeof options !== "object") {
    throw new Error("Runner options are required");
  }

  const config = options.config;
  if (!config || typeof config !== "object") {
    throw new Error("Runner config is required");
  }

  const runnerConfig = config.runner;
  if (!runnerConfig || typeof runnerConfig !== "object") {
    throw new Error("Runner loop config is required");
  }

  const generations = runnerConfig.generations;
  if (!Number.isInteger(generations) || generations <= 0) {
    throw new Error("Runner generations must be a positive integer");
  }

  const mapElitesConfig = config.mapElites;
  if (!mapElitesConfig || typeof mapElitesConfig !== "object") {
    throw new Error("Runner requires a MAP-Elites config");
  }

  const evaluation = options.evaluation;
  if (!evaluation || typeof evaluation !== "object") {
    throw new Error("Runner requires evaluation options");
  }
}
