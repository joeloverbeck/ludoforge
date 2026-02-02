/**
 * Orchestrate the full motif mining pipeline for a single generation.
 * @module evolution-runner/motif-pipeline
 */

import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { selectElitesForMining } from "./elite-selector.js";
import { extractEliteTrajectories } from "./elite-resimulator.js";
import { buildEffectMap, convertMotifsToEffects } from "../evaluation-analytics/motif-effect-converter.js";
import { buildLts } from "../evaluation-analytics/lts-builder.js";
import { mineMotifs } from "../evaluation-analytics/motif-miner.js";
import { writeMotifJsonl } from "../data-persistence/motif-store.js";
import { resolve } from "node:path";

/**
 * @param {{
 *   mapElitesResult: object,
 *   motifMiningConfig: object,
 *   simulationConfig?: object,
 *   generationDir: string,
 *   seed?: number,
 *   signal?: AbortSignal | null,
 *   logger?: object | null,
 * }} options
 * @returns {Promise<{ motifEffects: object[][], motifRecords: object[] } | null>}
 */
export async function runMotifMiningPipeline(options) {
  const { mapElitesResult, motifMiningConfig, simulationConfig = {}, generationDir, seed = 0, signal = null, logger = null } = options;

  if (motifMiningConfig.enabled !== true) {
    return null;
  }

  const elites = selectElitesForMining(mapElitesResult, motifMiningConfig.eliteSelection);

  if (logger) {
    logger.info({ eliteCount: elites.length }, "motif-pipeline: elites selected");
  }

  if (elites.length === 0) {
    return null;
  }

  const simulationRuns = motifMiningConfig.simulationRuns ?? 3;
  const trajStart = Date.now();
  const trajectories = await extractEliteTrajectories(elites, {
    simulationConfig,
    seed: motifMiningConfig.seed ?? seed,
    simulationRuns,
    signal,
    logger,
  });

  if (logger) {
    logger.info(
      { trajectoryCount: trajectories.length, durationMs: Date.now() - trajStart },
      "motif-pipeline: trajectories extracted",
    );
  }

  if (trajectories.length === 0) {
    return null;
  }

  const effectMap = buildEffectMap(trajectories);
  const lts = buildLts(trajectories);

  if (logger) {
    logger.info({ ltsNodeCount: lts.nodes?.length ?? 0, ltsEdgeCount: lts.edges?.length ?? 0 }, "motif-pipeline: LTS built");
  }

  const motifs = await mineMotifs(lts, {
    ngramSizes: motifMiningConfig.ngramSizes,
    minSupport: motifMiningConfig.minSupport,
    maxMotifLength: motifMiningConfig.maxMotifLength,
  }, { signal });

  if (logger) {
    logger.info({ motifCount: motifs.length }, "motif-pipeline: motifs mined");
  }

  const motifEffects = convertMotifsToEffects(motifs, effectMap);

  const now = new Date().toISOString();
  const motifRecords = motifs.map((motif, index) => ({
    id: randomUUID(),
    version: "v1",
    createdAt: now,
    signature: motif.signature,
    support: motif.support,
    ngramSize: motif.ngramSize,
    effectSequence: motifEffects[index] ?? [],
  }));

  await mkdir(generationDir, { recursive: true });
  const filePath = resolve(generationDir, "motifs.jsonl");
  await writeMotifJsonl(filePath, motifRecords);

  return { motifEffects, motifRecords };
}
