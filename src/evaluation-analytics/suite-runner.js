import { createSimulationEngine } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";
import { deriveSeed } from "../simulation-engine/seed-derivation.js";
import { adaptSimulationLog, LOG_ADAPTER_VERSION } from "./log-adapter.js";

/**
 * Run simulation batches for each agent suite.
 *
 * @param {object} params
 * @param {import("../dsl/types.js").GameDefinition} params.definition
 * @param {import("./agent-suite.js").AgentSuite[]} params.suites
 * @param {Record<string, number>} params.runsPerSuite — map of suiteId → run count
 * @param {number} params.baseSeed
 * @param {object} [params.simulationConfig]
 * @param {{ getOrRun: (key: string, runFn: () => any) => any }} params.cache
 * @returns {Record<string, { results: any[], trajectorySummaries: any[] | null, error?: string }>}
 */
export function runSuites({
  definition,
  suites,
  runsPerSuite,
  baseSeed,
  simulationConfig = {},
  cache,
}) {
  /** @type {Record<string, { results: any[], trajectorySummaries: any[] | null, error?: string }>} */
  const suiteResults = {};

  for (const suite of suites) {
    const runCount = runsPerSuite[suite.id] ?? 0;
    if (runCount <= 0) {
      continue;
    }

    const agents = suite.agents;
    /** @type {any[]} */
    const allResults = [];

    try {
      for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
        const seed =
          suite.seedPolicy === "fixed"
            ? /** @type {number} */ (suite.seed)
            : deriveSeed(baseSeed, suite.id, runIndex);

        const cacheKey = `${suite.id}:${seed}`;

        const result = cache.getOrRun(cacheKey, () => {
          const resolvedConfig = resolveSimulationDefaults({
            definition,
            agents,
            seed,
            ...simulationConfig,
          });
          const engine = createSimulationEngine(resolvedConfig);
          return engine.run();
        });

        allResults.push(result);
      }

      const adapted = adaptSimulationLog({
        version: LOG_ADAPTER_VERSION,
        log: { definition, results: allResults },
      });

      suiteResults[suite.id] = adapted.ok
        ? { results: allResults, trajectorySummaries: adapted.value.trajectorySummaries }
        : { results: allResults, trajectorySummaries: null, error: adapted.error };
    } catch (err) {
      suiteResults[suite.id] = {
        results: allResults,
        trajectorySummaries: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return suiteResults;
}
