import { runGenerationLoop } from "../evolutionary-engine/engine.js";
import { crossoverGenome } from "../evolutionary-engine/crossover.js";
import { mutateAndRepairGenome } from "../evolutionary-engine/mutation.js";
import { createSeededRng } from "../simulation-engine/rng.js";
import { writeGenerationArtifacts, writeSeedReport } from "./artifact-writer.js";
import { createRunId } from "./run-layout.js";
import { resolveSeedPopulation } from "./seed-resolver.js";

function assertNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function assertPopulation(population) {
  assertNonEmptyArray(population, "Population");
  population.forEach((genome, index) => {
    if (!genome || typeof genome !== "object") {
      throw new Error(`Population entry ${index} must be an object`);
    }
    if (typeof genome.id !== "string" || genome.id.trim().length === 0) {
      throw new Error(`Population entry ${index} must include a non-empty id`);
    }
    if (!genome.definition || typeof genome.definition !== "object") {
      throw new Error(`Population entry ${index} must include a definition object`);
    }
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveRate(value, label) {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
  return value;
}

function shouldApply(rate, rng) {
  if (rate <= 0) {
    return false;
  }
  if (rate >= 1) {
    return true;
  }
  const roll = rng ? rng.next() : Math.random();
  return roll < rate;
}

function cloneGenome(genome) {
  return structuredClone(genome);
}

function clonePopulation(population) {
  return population.map((genome) => cloneGenome(genome));
}

function selectMateIndex(length, currentIndex, rng) {
  if (length <= 1) {
    return -1;
  }
  const index = rng ? rng.nextInt(length) : Math.floor(Math.random() * length);
  if (index === currentIndex) {
    return (index + 1) % length;
  }
  return index;
}

function applyEvolution(population, options) {
  const parents = clonePopulation(population);
  const next = [];

  parents.forEach((parent, index) => {
    let child = cloneGenome(parent);

    if (options.crossoverRate > 0 && shouldApply(options.crossoverRate, options.rng)) {
      const mateIndex = selectMateIndex(parents.length, index, options.rng);
      const mate = mateIndex >= 0 ? parents[mateIndex] : null;
      if (mate) {
        const crossed = crossoverGenome(parent, mate, {
          operators: options.crossoverOperators,
          rng: options.rng,
        });
        if (crossed) {
          child = crossed;
        }
      }
    }

    if (options.mutationRate > 0 && shouldApply(options.mutationRate, options.rng)) {
      const mutated = mutateAndRepairGenome(child, {
        operators: options.mutationOperators,
        rng: options.rng,
        repairOperators: options.repairOperators,
      });
      if (mutated) {
        child = mutated;
      }
    }

    next.push(cloneGenome(child));
  });

  return next;
}

function serializeMapElites(mapElites) {
  if (!mapElites || typeof mapElites !== "object") {
    return mapElites;
  }

  const elites = mapElites.elites;
  const serializedElites =
    elites instanceof Map
      ? Array.from(elites.entries()).map(([nicheId, member]) => ({ nicheId, member }))
      : elites;

  return {
    ...mapElites,
    elites: serializedElites,
  };
}

function defaultPreferenceModelSnapshot({ runId, generation, seed }) {
  const createdAt = new Date(generation * 1000).toISOString();
  return {
    id: `${runId}-pref-${generation}`,
    version: "v1",
    createdAt,
    ...(Number.isFinite(seed) ? { seed } : {}),
    trainingWindow: { size: 0 },
    hyperparams: {},
    metrics: {},
    weights: {},
  };
}

function resolveSnapshotProvider(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  if (Array.isArray(provider)) {
    return () => provider;
  }
  return null;
}

function resolveFeedbackProvider(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  if (Array.isArray(provider)) {
    return () => provider;
  }
  return null;
}

export async function runEvolutionRunner(options) {
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

  const baseDir = options.baseDir ?? process.cwd();
  const runId = options.runId ?? createRunId();
  const startGeneration = Number.isInteger(options.startGeneration)
    ? options.startGeneration
    : 0;

  const seed = Number.isFinite(options.seed) ? options.seed : config.seed;

  let currentPopulation;
  if (Array.isArray(options.population) && options.population.length > 0) {
    currentPopulation = clonePopulation(options.population);
  } else if (config.seeding) {
    const rngSeed = Number.isFinite(seed) ? seed : 0;
    const seedResult = await resolveSeedPopulation({
      config,
      rngSeed,
      evaluator: evaluation.evaluator,
    });
    currentPopulation = seedResult.genomes;
    await writeSeedReport({ baseDir, runId, report: seedResult.report });
  } else {
    throw new Error(
      "Runner requires either options.population or config.seeding",
    );
  }
  assertPopulation(currentPopulation);
  const rng = options.rng ?? (Number.isFinite(seed) ? createSeededRng(seed) : null);

  const evolutionConfig = isPlainObject(config.evolution) ? config.evolution : {};
  const mutationConfig = isPlainObject(evolutionConfig.mutation) ? evolutionConfig.mutation : {};
  const crossoverConfig = isPlainObject(evolutionConfig.crossover) ? evolutionConfig.crossover : {};

  const mutationRate = resolveRate(mutationConfig.rate, "evolution.mutation.rate");
  const crossoverRate = resolveRate(crossoverConfig.rate, "evolution.crossover.rate");

  const snapshotProvider = resolveSnapshotProvider(options.preferenceModelSnapshots);
  const feedbackProvider = resolveFeedbackProvider(options.feedback);
  const feedbackEnabled = config.humanFeedback?.enabled === true;

  const results = [];

  for (let offset = 0; offset < generations; offset += 1) {
    const generation = startGeneration + offset;

    const loopResult = runGenerationLoop({
      population: currentPopulation,
      evaluation,
      mapElites: mapElitesConfig,
      rng: rng ?? undefined,
      shortlistSize: runnerConfig.shortlistSize,
    });

    const evolvedPopulation = applyEvolution(loopResult.nextGeneration, {
      rng: rng ?? undefined,
      mutationRate,
      crossoverRate,
      mutationOperators: options.mutationOperators,
      crossoverOperators: options.crossoverOperators,
      repairOperators: options.repairOperators,
    });

    assertPopulation(evolvedPopulation);

    let determinism = options.determinism;
    if (!determinism && rng) {
      determinism = {};
      if (Number.isFinite(seed)) {
        determinism.seed = seed;
      }
      if (Object.keys(determinism).length === 0) {
        determinism = undefined;
      }
    }

    const generationContext = {
      generation,
      runId,
      baseDir,
      loopResult,
      population: evolvedPopulation,
    };

    const feedback =
      feedbackEnabled && feedbackProvider ? feedbackProvider(generationContext) : undefined;
    const preferenceModelSnapshots = snapshotProvider
      ? snapshotProvider(generationContext)
      : [defaultPreferenceModelSnapshot({ runId, generation, seed })];
    assertNonEmptyArray(preferenceModelSnapshots, "Preference model snapshots");

    const artifacts = await writeGenerationArtifacts({
      baseDir,
      runId,
      generation,
      population: evolvedPopulation.map((genome) => ({
        id: genome.id,
        definition: genome.definition,
      })),
      evaluated: loopResult.evaluated,
      rejected: loopResult.rejected,
      mapElites: serializeMapElites(loopResult.mapElites),
      shortlist: loopResult.shortlist,
      feedback,
      preferenceModelSnapshots,
      determinism,
    });

    results.push({
      generation,
      population: evolvedPopulation,
      evaluated: loopResult.evaluated,
      rejected: loopResult.rejected,
      mapElites: loopResult.mapElites,
      shortlist: loopResult.shortlist,
      artifacts,
    });

    currentPopulation = evolvedPopulation;
  }

  return {
    runId,
    baseDir,
    generations: results,
  };
}
