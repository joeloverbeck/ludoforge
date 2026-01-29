import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, resolve } from "node:path";
import { serializeGameDefinition } from "../dsl/serialize.js";
import { createSeededRng } from "../simulation-engine/rng.js";

/**
 * @param {import("../dsl/types.js").GameDefinition} definition
 * @returns {string}
 */
function hashDefinition(definition) {
  const canonical = serializeGameDefinition(definition);
  const hex = createHash("sha256").update(canonical).digest("hex");
  return `genome-${hex}`;
}

/**
 * @template T
 * @param {T[]} items
 * @param {{ next(): number }} rng
 * @returns {T[]}
 */
function shuffleCopy(items, rng) {
  const copy = items.slice();
  for (let i = copy.length - 1; i >= 1; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * @param {{
 *   folderPath: string,
 *   populationSize: number,
 *   rngSeed: number,
 *   onInvalid?: "error" | "skip"
 * }} options
 * @returns {Promise<{
 *   genomes: Array<{ id: string, definition: import("../dsl/types.js").GameDefinition }>,
 *   report: { filesFound: number, filesLoaded: number, filesSkipped: number, genomesReturned: number }
 * }>}
 */
export async function loadFolderSeeds({
  folderPath,
  populationSize,
  rngSeed,
  onInvalid = "error",
}) {
  const entries = await readdir(folderPath, { withFileTypes: true });

  const jsonFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name) === ".json")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const filesFound = jsonFiles.length;
  let filesSkipped = 0;
  const genomes = [];

  for (const filename of jsonFiles) {
    const filePath = resolve(folderPath, filename);
    const raw = await readFile(filePath, "utf8");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (onInvalid === "error") {
        throw new Error(`Failed to parse JSON from ${filePath}`);
      }
      filesSkipped++;
      continue;
    }

    genomes.push({
      id: hashDefinition(parsed),
      definition: parsed,
    });
  }

  const filesLoaded = genomes.length;

  let result = genomes;
  if (genomes.length > populationSize) {
    const rng = createSeededRng(rngSeed);
    const shuffled = shuffleCopy(genomes, rng);
    result = shuffled.slice(0, populationSize);
  }

  return {
    genomes: result,
    report: {
      filesFound,
      filesLoaded,
      filesSkipped,
      genomesReturned: result.length,
    },
  };
}
