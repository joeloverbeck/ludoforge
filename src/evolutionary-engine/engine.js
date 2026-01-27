import { evaluateGenome } from "./evaluation-adapter.js";
import { placePopulationInMapElites } from "./map-elites.js";

function getRandomValue(rng) {
  if (rng && typeof rng.next === "function") {
    return rng.next();
  }
  return Math.random();
}

function extractFitnessValue(member, config) {
  const { fitness } = member;
  if (fitness === undefined) {
    return null;
  }
  if (typeof fitness === "number") {
    return Number.isFinite(fitness) ? fitness : null;
  }
  if (config.fitnessKey) {
    const keyed = fitness[config.fitnessKey];
    return typeof keyed === "number" && Number.isFinite(keyed) ? keyed : null;
  }
  return null;
}

function coordinateDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return 0;
  }
  const length = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < length; i += 1) {
    total += Math.abs(a[i] - b[i]);
  }
  return total;
}

function selectShortlist(placements, config, options) {
  const size = Math.max(0, options?.size ?? 0);
  if (size === 0) {
    return [];
  }

  const rng = options?.rng;
  const candidates = placements
    .filter((placement) => placement.isElite)
    .map((placement, index) => {
      const fitnessValue = extractFitnessValue(placement.member, config);
      return {
        placement,
        fitnessValue,
        randomKey: getRandomValue(rng),
        index,
      };
    });

  if (candidates.length === 0) {
    return [];
  }

  candidates.sort((a, b) => {
    const fitnessA = a.fitnessValue ?? -Infinity;
    const fitnessB = b.fitnessValue ?? -Infinity;
    if (fitnessA !== fitnessB) {
      return fitnessB - fitnessA;
    }
    if (a.randomKey !== b.randomKey) {
      return a.randomKey - b.randomKey;
    }
    return a.index - b.index;
  });

  const selected = [];
  const remaining = candidates.slice();

  const initial = remaining.shift();
  if (initial) {
    selected.push(initial);
  }

  while (selected.length < size && remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = -Infinity;
    let bestFitness = -Infinity;
    let bestRandom = Infinity;
    let bestOriginalIndex = Infinity;

    remaining.forEach((candidate, index) => {
      const minDistance = selected.reduce((min, chosen) => {
        const distance = coordinateDistance(
          candidate.placement.coordinates,
          chosen.placement.coordinates
        );
        return Math.min(min, distance);
      }, Infinity);

      const fitnessValue = candidate.fitnessValue ?? -Infinity;
      const randomKey = candidate.randomKey;
      const originalIndex = candidate.index;

      const isBetter =
        minDistance > bestDistance ||
        (minDistance === bestDistance && fitnessValue > bestFitness) ||
        (minDistance === bestDistance &&
          fitnessValue === bestFitness &&
          randomKey < bestRandom) ||
        (minDistance === bestDistance &&
          fitnessValue === bestFitness &&
          randomKey === bestRandom &&
          originalIndex < bestOriginalIndex);

      if (isBetter) {
        bestIndex = index;
        bestDistance = minDistance;
        bestFitness = fitnessValue;
        bestRandom = randomKey;
        bestOriginalIndex = originalIndex;
      }
    });

    const next = remaining.splice(bestIndex, 1)[0];
    if (next) {
      selected.push(next);
    }
  }

  return selected.map((candidate) => candidate.placement.member.genome);
}

export function runGenerationLoop(options) {
  if (!options || !Array.isArray(options.population)) {
    throw new Error("Generation loop requires a population array");
  }
  if (!options.evaluation) {
    throw new Error("Generation loop requires evaluation options");
  }
  if (!options.mapElites) {
    throw new Error("Generation loop requires a MAP-Elites config");
  }

  const evaluated = [];
  const rejected = [];

  options.population.forEach((genome) => {
    const result = evaluateGenome(genome, options.evaluation);
    if (result.fitness == null || result.descriptors == null) {
      rejected.push({ genome, diagnostics: result.diagnostics });
      return;
    }
    evaluated.push({
      genome,
      fitness: result.fitness,
      descriptors: result.descriptors,
      diagnostics: result.diagnostics,
    });
  });

  const mapElites = placePopulationInMapElites(evaluated, options.mapElites);
  const nextGeneration = Array.from(mapElites.elites.values()).map(
    (member) => member.genome
  );

  const shortlist = selectShortlist(mapElites.placements, options.mapElites, {
    size: options.shortlistSize ?? 0,
    rng: options.rng,
  });

  return {
    evaluated,
    rejected,
    mapElites,
    nextGeneration,
    shortlist,
  };
}
