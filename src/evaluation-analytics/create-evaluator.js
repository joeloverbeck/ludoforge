import { createSimulationEngine } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";
import { LOG_ADAPTER_VERSION, adaptSimulationLog } from "./log-adapter.js";
import { computeCoreMetrics } from "./metrics/core.js";
import { computeExtendedMetrics } from "./metrics/extended.js";
import { detectDegeneracy } from "./degeneracy.js";
import {
  assembleFeatureVector,
  NON_FINITE_POLICY_MODE,
  NON_FINITE_PER_KEY_PENALTY,
  NON_FINITE_MAX_PENALTY,
  computeNonFinitePenaltyMultiplier,
} from "./feature-vector.js";
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
 * @param {string} [options.nonFinitePolicy]
 * @param {{ perKeyPenalty?: number, maxPenalty?: number }} [options.nonFinitePenalty]
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
    nonFinitePolicy = NON_FINITE_POLICY_MODE,
    nonFinitePenalty = {
      perKeyPenalty: NON_FINITE_PER_KEY_PENALTY,
      maxPenalty: NON_FINITE_MAX_PENALTY,
    },
  } = options;

  async function evaluator(genome, context) {
    const logger = context?.logger ?? null;
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
      const engine = createSimulationEngine({ ...resolvedConfig, logger });
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

    // Step 9: Identify non-finite metric keys (cheap scan before degeneracy + feature vector)
    const nonFiniteKeys = allMetrics
      .filter((m) => m && typeof m.id === "string" && !Number.isFinite(m.value))
      .map((m) => m.id);

    // Step 10: Detect degeneracy (with non-finite keys for non-finite-metrics flag)
    const degeneracyReport = detectDegeneracy(trajectorySummaries, degeneracyThresholds, {
      nonFiniteKeys,
    });

    // Step 11: Assemble feature vector
    const { vector: featureVector } = assembleFeatureVector(allMetrics, degeneracyReport);

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

    // Step 10c: Non-finite metric policy enforcement (reject)
    if (nonFiniteKeys.length > 0 && nonFinitePolicy === "reject") {
      return {
        fitness: null,
        descriptors: null,
        diagnostics: {
          coreMetrics,
          extendedMetrics: includeExtendedMetrics ? extendedMetrics : null,
          degeneracy: degeneracyReport,
          featureVector,
          simulationCount: results.length,
          logAdapterOk: true,
          nonFiniteMetrics: nonFiniteKeys,
          nonFinitePolicy: "reject",
          ...(suiteResults != null ? { suiteResults } : {}),
        },
      };
    }

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

    // Step 11b: Non-finite metric policy enforcement (penalize)
    let finalFitness = fitnessScore;
    let nonFinitePenaltyMultiplier = 1;

    if (nonFinitePolicy === "penalize" && nonFiniteKeys.length > 0) {
      nonFinitePenaltyMultiplier = computeNonFinitePenaltyMultiplier(
        nonFiniteKeys.length,
        nonFinitePenalty.perKeyPenalty ?? NON_FINITE_PER_KEY_PENALTY,
        nonFinitePenalty.maxPenalty ?? NON_FINITE_MAX_PENALTY,
      );
      finalFitness = fitnessScore * nonFinitePenaltyMultiplier;
    }

    if (!Number.isFinite(finalFitness)) {
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
          ...(nonFiniteKeys.length > 0 ? { nonFiniteMetrics: nonFiniteKeys } : {}),
          ...(nonFinitePenaltyMultiplier < 1 ? { nonFinitePenaltyMultiplier } : {}),
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
      fitness: finalFitness,
      descriptors,
      diagnostics: {
        coreMetrics,
        extendedMetrics: includeExtendedMetrics ? extendedMetrics : null,
        degeneracy: degeneracyReport,
        featureVector,
        fitnessResult,
        simulationCount: results.length,
        logAdapterOk: true,
        ...(nonFiniteKeys.length > 0 ? { nonFiniteMetrics: nonFiniteKeys } : {}),
        ...(nonFinitePenaltyMultiplier < 1 ? { nonFinitePenaltyMultiplier } : {}),
        ...(suiteResults != null ? { suiteResults } : {}),
      },
    };
  }

  return { evaluator };
}
