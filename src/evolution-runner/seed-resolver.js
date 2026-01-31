import { loadFolderSeeds } from "./folder-seeder.js";
import { generateSeedPopulation } from "../seed-generation/generate-seed-population.js";

/**
 * @param {{
 *   config: { seeding: import("./seed-resolver-types.js").SeedingConfig, mapElites: object, seed?: number },
 *   rngSeed: number,
 *   evaluator: (genome: { id: string, definition: object }) => { descriptors: Record<string, number> }
 * }} options
 * @returns {Promise<{ genomes: Array<{ id: string, definition: object }>, report: object }>}
 */
export async function resolveSeedPopulation({ config, rngSeed, evaluator }) {
  const seeding = config.seeding;
  const mode = seeding.mode;

  if (mode === "generate") {
    return resolveGenerate({ seeding, mapElitesConfig: config.mapElites, rngSeed, evaluator });
  }

  if (mode === "folder") {
    return resolveFolder({ seeding, rngSeed });
  }

  if (mode === "mixed") {
    return resolveMixed({ seeding, mapElitesConfig: config.mapElites, rngSeed, evaluator });
  }

  throw new Error(`Unknown seeding mode: ${mode}`);
}

async function resolveGenerate({ seeding, mapElitesConfig, rngSeed, evaluator }) {
  const generateConfig = seeding.generate;
  const result = await generateSeedPopulation({
    populationSize: seeding.populationSize,
    maxAttempts: generateConfig.coverage.maxAttempts,
    rngSeed,
    generator: generateConfig.grammar,
    evaluator,
    mapElitesConfig,
    coverageStrategy: generateConfig.coverage.strategy,
    fallback: generateConfig.coverage.fallback,
  });

  return {
    genomes: result.genomes,
    report: {
      mode: "generate",
      generate: result.report,
    },
  };
}

async function resolveFolder({ seeding, rngSeed }) {
  const folderConfig = seeding.folder;
  const result = await loadFolderSeeds({
    folderPath: folderConfig.path,
    populationSize: seeding.populationSize,
    rngSeed,
    onInvalid: folderConfig.onInvalid,
  });

  return {
    genomes: result.genomes,
    report: {
      mode: "folder",
      folder: result.report,
    },
  };
}

async function resolveMixed({ seeding, mapElitesConfig, rngSeed, evaluator }) {
  const folderFraction = seeding.mix.folderFraction;
  const totalSize = seeding.populationSize;
  const folderTarget = Math.floor(totalSize * folderFraction);

  const folderConfig = seeding.folder;
  const folderResult = await loadFolderSeeds({
    folderPath: folderConfig.path,
    populationSize: folderTarget,
    rngSeed,
    onInvalid: folderConfig.onInvalid,
  });

  const folderGenomes = folderResult.genomes;
  const generateCount = totalSize - folderGenomes.length;

  let generateReport = null;
  let generatedGenomes = [];

  if (generateCount > 0) {
    const generateConfig = seeding.generate;
    const genResult = await generateSeedPopulation({
      populationSize: generateCount,
      maxAttempts: generateConfig.coverage.maxAttempts,
      rngSeed,
      generator: generateConfig.grammar,
      evaluator,
      mapElitesConfig,
      coverageStrategy: generateConfig.coverage.strategy,
      fallback: generateConfig.coverage.fallback,
    });
    generatedGenomes = genResult.genomes;
    generateReport = genResult.report;
  }

  return {
    genomes: [...folderGenomes, ...generatedGenomes],
    report: {
      mode: "mixed",
      folder: folderResult.report,
      generate: generateReport,
      mix: {
        folderFraction,
        folderTarget,
        folderActual: folderGenomes.length,
        generateCount: generatedGenomes.length,
        total: folderGenomes.length + generatedGenomes.length,
      },
    },
  };
}
