import { loadConfigFile } from "../config/loader.js";

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultMapElitesConfig() {
  const result = await loadConfigFile({ name: "map-elites" });
  if (!result.valid) {
    throw new Error(
      `MAP-Elites config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

export const DEFAULT_MAP_ELITES_CONFIG = await loadDefaultMapElitesConfig();

export function binDescriptorValue(value, config) {
  const { min, max, bins } = config;
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(bins)) {
    throw new Error("Descriptor config must use finite numbers");
  }
  if (bins <= 0 || !Number.isInteger(bins)) {
    throw new Error("Descriptor bins must be a positive integer");
  }
  if (max <= min) {
    throw new Error("Descriptor max must be greater than min");
  }

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "unknown";
  }
  if (value < min) {
    return "under";
  }
  if (value > max) {
    return "over";
  }

  const t = (value - min) / (max - min);
  return Math.min(bins - 1, Math.floor(t * bins));
}

export function getDescriptorCoordinates(descriptors, config) {
  if (!descriptors) {
    return config.descriptors.map(() => "unknown");
  }
  return config.descriptors.map((descriptorConfig) => {
    const value = descriptors[descriptorConfig.id];
    return binDescriptorValue(value, descriptorConfig);
  });
}

export function getNicheId(config, coordinates) {
  const labels = config.descriptors.map((descriptorConfig, index) => {
    const coordinate = coordinates[index];
    return `${descriptorConfig.id}:${coordinate}`;
  });
  return labels.join("|");
}

function extractFitness(member, config) {
  const { fitness } = member;
  if (fitness === undefined) {
    return { ok: false, reason: "missing-fitness" };
  }
  if (typeof fitness === "number") {
    if (!Number.isFinite(fitness)) {
      return { ok: false, reason: "non-finite-fitness" };
    }
    return { ok: true, value: fitness };
  }
  if (config.fitnessKey) {
    const keyed = fitness[config.fitnessKey];
    if (typeof keyed !== "number" || !Number.isFinite(keyed)) {
      return { ok: false, reason: "invalid-fitness-key" };
    }
    return { ok: true, value: keyed };
  }
  return { ok: false, reason: "missing-fitness-key" };
}

function compareMembers(candidate, elite, config) {
  if (config.compareFitness) {
    return config.compareFitness(candidate, elite);
  }
  const candidateFitness = extractFitness(candidate, config);
  const eliteFitness = extractFitness(elite, config);
  if (!candidateFitness.ok || !eliteFitness.ok) {
    return 0;
  }
  if (candidateFitness.value === eliteFitness.value) {
    return 0;
  }
  return candidateFitness.value > eliteFitness.value ? 1 : -1;
}

export function placePopulationInMapElites(population, config) {
  const elites = new Map();
  const placements = [];
  const skipped = [];
  const elitePlacementIndex = new Map();

  population.forEach((member) => {
    if (!member.descriptors) {
      skipped.push({ member, reason: "missing-descriptors" });
      return;
    }

    const fitness = extractFitness(member, config);
    if (!fitness.ok) {
      skipped.push({ member, reason: fitness.reason });
      return;
    }

    const coordinates = getDescriptorCoordinates(member.descriptors, config);
    const nicheId = getNicheId(config, coordinates);
    const placementIndex = placements.length;

    placements.push({
      member,
      nicheId,
      coordinates,
      isElite: false,
      noveltyScore: 0,
      contributionKind: "none",
    });

    const currentElite = elites.get(nicheId);
    if (!currentElite) {
      elites.set(nicheId, member);
      elitePlacementIndex.set(nicheId, placementIndex);
      placements[placementIndex].contributionKind = "filledEmpty";
      return;
    }

    const comparison = compareMembers(member, currentElite, config);
    if (comparison > 0 || (comparison === 0 && config.tieBreak === "replace")) {
      elites.set(nicheId, member);
      elitePlacementIndex.set(nicheId, placementIndex);
      placements[placementIndex].contributionKind = "improvedElite";
    }
  });

  elitePlacementIndex.forEach((placementIndex) => {
    const placement = placements[placementIndex];
    if (placement) {
      placement.isElite = true;
    }
  });

  return {
    elites,
    placements,
    skipped,
  };
}
