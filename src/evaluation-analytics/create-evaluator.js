import { createSimulationEngine } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";
import { LOG_ADAPTER_VERSION, adaptSimulationLog } from "./log-adapter.js";
import { computeCoreMetrics } from "./metrics/core.js";
import { computeExtendedMetrics } from "./metrics/extended.js";
import { detectDegeneracy } from "./degeneracy.js";
import { assembleFeatureVector } from "./feature-vector.js";
import { computePreferenceAwareFitness } from "./fitness.js";
import { createRunCache } from "../simulation-engine/run-cache.js";
import { runSuites } from "./suite-runner.js";

/**
 * @param {import("../dsl/types.js").GameDefinition} definition
 * @param {number} playerCount
 * @returns {Array<import("../simulation-engine/types.js").AgentDescriptor>}
 */
function defaultAgentFactory(definition, playerCount) {
  return Array.from({ length: playerCount }, () => ({ kind: "random" }));
}

/**
 * Creates an evaluator that runs the 13-step evaluation pipeline.
 *
 * @param {object} [options]
 * @param {object} [options.simulationConfig]
 * @param {number} [options.simulationRuns]
 * @param {function} [options.agentFactory]
 * @param {object} [options.fitnessOptions]
 * @param {object} [options.degeneracyThresholds]
 * @param {import("./types.js").PreferenceModelState | null} [options.preferenceModelState]
 * @param {string[]} [options.descriptorKeys]
 * @param {boolean} [options.includeExtendedMetrics]
 * @param {object} [options.extendedMetricsOptions]
 * @param {number | null} [options.seed]
 * @param {import("./agent-suite.js").AgentSuite[]} [options.agentSuites]
 * @param {Record<string, number>} [options.agentSuiteRuns]
 * @param {{ enabled?: boolean }} [options.portfolioMetrics]
 * @returns {{ evaluator: function }}
 */
export function createEvaluator(options = {}) {
  const {
    simulationConfig = {},
    simulationRuns = 5,
    agentFactory,
    fitnessOptions = {},
    degeneracyThresholds = {},
    preferenceModelState = null,
    descriptorKeys = ["agency", "variety"],
    includeExtendedMetrics = false,
    extendedMetricsOptions = {},
    seed = null,
    agentSuites = [],
    agentSuiteRuns = {},
    portfolioMetrics = {},
  } = options;

  async function evaluator(genome) {
    const definition = genome.definition;

    // Step 1: Create agents
    const agents = agentFactory
      ? agentFactory(definition)
      : defaultAgentFactory(definition, definition.players.count);

    // Step 2: Resolve simulation defaults
    const resolvedConfig = resolveSimulationDefaults({
      definition,
      agents,
      ...(seed != null ? { seed } : {}),
      ...simulationConfig,
    });

    // Step 3: Create simulation engine + Step 4: Run N simulations
    let results;
    try {
      const engine = createSimulationEngine(resolvedConfig);
      results = await engine.runBatch(simulationRuns);
    } catch (err) {
      return {
        fitness: null,
        descriptors: null,
        diagnostics: {
          simulationError: true,
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }

    // Step 4b: Optionally run agent suite simulations
    const shouldRunSuites = portfolioMetrics.enabled === true && agentSuites.length > 0;
    let suiteResults = null;
    if (shouldRunSuites) {
      const baseSeed = seed ?? 0;
      const cache = createRunCache();
      suiteResults = await runSuites({
        definition,
        suites: agentSuites,
        runsPerSuite: agentSuiteRuns,
        baseSeed,
        simulationConfig,
        cache,
      });
    }

    // Step 5: Adapt simulation log
    const adapted = adaptSimulationLog({
      version: LOG_ADAPTER_VERSION,
      log: { definition, results },
    });

    if (!adapted.ok) {
      return {
        fitness: null,
        descriptors: null,
        diagnostics: {
          error: adapted.error,
          logAdapterOk: false,
        },
      };
    }

    const { trajectorySummaries } = adapted.value;

    // Step 6: Compute core metrics
    const coreMetrics = computeCoreMetrics(trajectorySummaries);

    // Step 7: Optionally compute extended metrics
    const extendedMetrics = includeExtendedMetrics
      ? await computeExtendedMetrics(definition, trajectorySummaries, {
          ...extendedMetricsOptions,
          simulations: results,
        }, suiteResults)
      : [];

    // Step 8: Concatenate metrics
    const allMetrics = [...coreMetrics, ...extendedMetrics];

    // Step 9: Detect degeneracy
    const degeneracyReport = detectDegeneracy(trajectorySummaries, degeneracyThresholds);

    // Step 10: Assemble feature vector
    const { vector: featureVector, nonFiniteKeys } = assembleFeatureVector(allMetrics, degeneracyReport);

    // Step 10b: Inject structural complexity descriptor
    const tokenTypeCount = Array.isArray(definition.state?.tokenTypes) ? definition.state.tokenTypes.length : 0;
    const zoneCount = Array.isArray(definition.state?.zones) ? definition.state.zones.length : 0;
    const triggerCount = Array.isArray(definition.triggers) ? definition.triggers.length : 0;
    const effectKinds = new Set();
    for (const action of definition.actions ?? []) {
      for (const effect of action.effects ?? []) {
        if (typeof effect.kind === "string") {
          effectKinds.add(effect.kind);
        }
      }
    }
    featureVector.structural_complexity = tokenTypeCount + zoneCount + triggerCount + effectKinds.size;

    // Step 11: Compute fitness
    const fitnessResult = computePreferenceAwareFitness(featureVector, {
      ...fitnessOptions,
      preferenceModelState,
      degeneracyReport,
    });

    const fitnessScore = fitnessResult.score;
    if (!Number.isFinite(fitnessScore)) {
      return {
        fitness: null,
        descriptors: null,
        diagnostics: {
          coreMetrics,
          extendedMetrics: includeExtendedMetrics ? extendedMetrics : null,
          degeneracy: degeneracyReport,
          featureVector,
          fitnessResult,
          simulationCount: results.length,
          logAdapterOk: true,
          nonFiniteFitness: true,
          ...(suiteResults != null ? { suiteResults } : {}),
        },
      };
    }

    // Step 12: Extract descriptors
    const nonFiniteSet = new Set(nonFiniteKeys);
    const descriptors = Object.fromEntries(
      descriptorKeys.map((k) => [k, nonFiniteSet.has(k) ? null : (featureVector[k] ?? 0)])
    );

    // Step 13: Return result
    return {
      fitness: fitnessScore,
      descriptors,
      diagnostics: {
        coreMetrics,
        extendedMetrics: includeExtendedMetrics ? extendedMetrics : null,
        degeneracy: degeneracyReport,
        featureVector,
        fitnessResult,
        simulationCount: results.length,
        logAdapterOk: true,
        ...(suiteResults != null ? { suiteResults } : {}),
      },
    };
  }

  return { evaluator };
}
