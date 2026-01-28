import { stat, readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const JSON_EXT = ".json";
const JSONL_EXT = ".jsonl";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isDefinitionObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatEntrySource(source, entryIndex) {
  if (source.type === "jsonl") {
    return `${source.path} line ${entryIndex}`;
  }
  return `${source.path} entry ${entryIndex}`;
}

function normalizeSeedEntry(entry, source, entryIndex) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Seed entry at ${formatEntrySource(source, entryIndex)} is not an object.`);
  }

  const { id, definition } = entry;

  if (!isNonEmptyString(id)) {
    throw new Error(`Seed entry at ${formatEntrySource(source, entryIndex)} is missing a valid id.`);
  }

  if (!isDefinitionObject(definition)) {
    throw new Error(
      `Seed entry at ${formatEntrySource(source, entryIndex)} is missing a valid definition.`,
    );
  }

  return { id, definition };
}

function normalizeSeedEntries(entries, source) {
  const list = Array.isArray(entries) ? entries : [entries];
  return list.map((entry, index) => normalizeSeedEntry(entry, source, index));
}

async function loadJsonSeeds(filePath) {
  const contents = await readFile(filePath, "utf8");
  const parsed = JSON.parse(contents);
  return normalizeSeedEntries(parsed, { type: "json", path: filePath });
}

async function loadJsonlSeeds(filePath) {
  const contents = await readFile(filePath, "utf8");
  const lines = contents.split(/\r?\n/);
  const seeds = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      throw new Error(`Invalid JSONL at ${filePath} line ${index + 1}: ${message}`);
    }
    seeds.push(normalizeSeedEntry(parsed, { type: "jsonl", path: filePath }, index + 1));
  });

  return seeds;
}

async function loadSeedsFromFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === JSON_EXT) {
    return loadJsonSeeds(filePath);
  }
  if (ext === JSONL_EXT) {
    return loadJsonlSeeds(filePath);
  }
  throw new Error(`Unsupported seed file extension for ${filePath}`);
}

async function loadSeedsFromDirectory(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const seeds = [];
  for (const fileName of files) {
    const filePath = resolve(dirPath, fileName);
    const fileSeeds = await loadSeedsFromFile(filePath);
    seeds.push(...fileSeeds);
  }

  return seeds;
}

export async function loadSeedPopulation(seedPath) {
  const stats = await stat(seedPath);
  if (stats.isDirectory()) {
    return loadSeedsFromDirectory(seedPath);
  }
  if (stats.isFile()) {
    return loadSeedsFromFile(seedPath);
  }
  throw new Error(`Seed path is not a file or directory: ${seedPath}`);
}
