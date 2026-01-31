import { CLIError } from "./cli-error.js";

/**
 * @param {string[]} runs
 * @returns {string}
 */
function formatRunList(runs) {
  if (runs.length === 0) {
    return "No runs found in this directory.";
  }
  return `Available runs: ${runs.join(", ")}`;
}

/**
 * Resolves and validates the run ID from parsed CLI arguments.
 *
 * @param {{
 *   parsed: { runId?: string, resume?: boolean, out?: string },
 *   baseDir: string,
 *   deps: {
 *     assertValidRunId: (id: string) => void,
 *     listRuns: (dir: string) => Promise<string[]>,
 *     createRunId: () => string,
 *   },
 * }} options
 * @returns {Promise<{ runId: string, existingRuns: string[] }>}
 */
export async function resolveRunId({ parsed, baseDir, deps }) {
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
      deps.assertValidRunId(runId);
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
    return { runId, existingRuns };
  }

  if (runId) {
    try {
      deps.assertValidRunId(runId);
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

  return { runId, existingRuns };
}
