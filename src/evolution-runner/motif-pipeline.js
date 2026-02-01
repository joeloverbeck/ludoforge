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
 * }} options
 * @returns {Promise<{ motifEffects: object[][], motifRecords: object[] } | null>}
 */
export async function runMotifMiningPipeline(options) {
  const { mapElitesResult, motifMiningConfig, simulationConfig = {}, generationDir, seed = 0, signal = null } = options;

  if (motifMiningConfig.enabled !== true) {
    return null;
  }

  const elites = selectElitesForMining(mapElitesResult, motifMiningConfig.eliteSelection);

  if (elites.length === 0) {
    return null;
  }

  const simulationRuns = motifMiningConfig.simulationRuns ?? 3;
  const trajectories = await extractEliteTrajectories(elites, {
    simulationConfig,
    seed: motifMiningConfig.seed ?? seed,
    simulationRuns,
  });

  if (trajectories.length === 0) {
    return null;
  }

  const effectMap = buildEffectMap(trajectories);
  const lts = buildLts(trajectories);

  const motifs = await mineMotifs(lts, {
    ngramSizes: motifMiningConfig.ngramSizes,
    minSupport: motifMiningConfig.minSupport,
    maxMotifLength: motifMiningConfig.maxMotifLength,
  }, { signal });

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
