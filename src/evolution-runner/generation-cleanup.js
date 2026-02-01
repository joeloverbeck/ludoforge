import { readdir, rm } from "node:fs/promises";
import { resolveRunDir, resolveRunPath } from "./run-layout.js";

// Pattern coupled to generationDirPattern in configs/evolution-runner.json
const GENERATION_PATTERN = /^generation-(\d+)$/;

function parseGenerationNumber(name) {
  const match = GENERATION_PATTERN.exec(name);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

/**
 * Removes the oldest generation directories when the count exceeds maxRetained.
 * Returns { removed: [{ name, generation }] } listing what was deleted.
 * No-op when maxRetained is null, undefined, or not a positive integer.
 */
export async function pruneOldGenerations({ baseDir, runId, maxRetained }) {
  if (maxRetained == null || !Number.isInteger(maxRetained) || maxRetained < 1) {
    return { removed: [] };
  }

  const runDir = resolveRunDir(baseDir, runId);
  const entries = await readdir(runDir, { withFileTypes: true });

  const generationDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const gen = parseGenerationNumber(entry.name);
    if (gen !== null) {
      generationDirs.push({ name: entry.name, generation: gen });
    }
  }

  if (generationDirs.length <= maxRetained) {
    return { removed: [] };
  }

  generationDirs.sort((a, b) => a.generation - b.generation);

  const excessCount = generationDirs.length - maxRetained;
  const toRemove = generationDirs.slice(0, excessCount);

  const removed = [];
  for (const dir of toRemove) {
    const dirPath = resolveRunPath(runDir, dir.name);
    await rm(dirPath, { recursive: true, force: true });
    removed.push({ name: dir.name, generation: dir.generation });
  }

  return { removed };
}
