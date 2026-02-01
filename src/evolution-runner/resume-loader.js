import { readFile, readdir, stat } from "node:fs/promises";
import { readPreferenceModelSnapshotJsonl } from "../data-persistence/preference-model-store.js";
import { assertValidRunId, resolveRunDir, resolveRunPath } from "./run-layout.js";
import { DEFAULT_RUNNER_LAYOUT } from "./runner-defaults.js";

const GENERATION_DIR_PATTERN = /^generation-(\d+)$/;

function normalizeDescriptorSet(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return null;
  }

  const normalized = descriptors.map((descriptor) => ({
    id: descriptor?.id,
    min: descriptor?.min,
    max: descriptor?.max,
    bins: descriptor?.bins,
  }));

  if (normalized.some((descriptor) => typeof descriptor.id !== "string")) {
    return null;
  }

  normalized.sort((left, right) => left.id.localeCompare(right.id));
  return normalized;
}

function assertConfigCompatibility(runConfig, expectedConfig, resumeConfig = DEFAULT_RUNNER_LAYOUT.resume) {
  if (!runConfig || typeof runConfig !== "object") {
    throw new Error("Run metadata is missing config snapshot");
  }
  if (!expectedConfig || typeof expectedConfig !== "object") {
    throw new Error("Resume config is required");
  }

  const requireConfigMatch = resumeConfig?.requireConfigMatch ?? true;
  const requireDescriptorMatch = resumeConfig?.requireDescriptorMatch ?? true;

  if (requireConfigMatch && runConfig.version !== expectedConfig.version) {
    throw new Error(
      `Run config version '${runConfig.version}' does not match '${expectedConfig.version}'`,
    );
  }

  if (requireDescriptorMatch) {
    const runDescriptors = normalizeDescriptorSet(runConfig.mapElites?.descriptors);
    const expectedDescriptors = normalizeDescriptorSet(expectedConfig.mapElites?.descriptors);

    if (!runDescriptors || !expectedDescriptors) {
      throw new Error("Run config descriptor snapshot is invalid or missing");
    }

    if (JSON.stringify(runDescriptors) !== JSON.stringify(expectedDescriptors)) {
      throw new Error("Run config MAP-Elites descriptors do not match");
    }
  }
}

function parseJsonlWithLineNumbers(contents, filePath) {
  const lines = contents.split(/\r?\n/);
  const records = [];

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
    records.push({ value: parsed, line: index + 1 });
  });

  return records;
}

function normalizePopulationEntry(entry, filePath, line) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Population entry at ${filePath} line ${line} is not an object.`);
  }

  const candidate = entry.genome && typeof entry.genome === "object" ? entry.genome : entry;
  const { id, definition } = candidate;

  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`Population entry at ${filePath} line ${line} is missing a valid id.`);
  }
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new Error(
      `Population entry at ${filePath} line ${line} is missing a valid definition.`,
    );
  }

  return { id, definition };
}

async function loadRunMetadata(runDir, runId, artifacts = DEFAULT_RUNNER_LAYOUT.artifacts) {
  const metadataPath = resolveRunPath(runDir, artifacts.runMetadata);
  let contents;
  try {
    contents = await readFile(metadataPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Run metadata is missing for run '${runId}'.`);
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Run metadata is corrupt for run '${runId}': ${message}`);
  }

  if (parsed.runId && parsed.runId !== runId) {
    throw new Error(`Run metadata runId '${parsed.runId}' does not match '${runId}'.`);
  }

  return parsed;
}

async function findLatestGeneration(runDir, runId) {
  const entries = await readdir(runDir, { withFileTypes: true });
  let latest = null;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const match = entry.name.match(GENERATION_DIR_PATTERN);
    if (!match) {
      continue;
    }
    const generation = Number.parseInt(match[1], 10);
    if (!Number.isFinite(generation)) {
      continue;
    }
    if (!latest || generation > latest.generation) {
      latest = { generation, name: entry.name };
    }
  }

  if (!latest) {
    throw new Error(`Run '${runId}' has no generation artifacts to resume.`);
  }

  return {
    generation: latest.generation,
    generationDir: resolveRunPath(runDir, latest.name),
    generationName: latest.name,
  };
}

async function loadPopulation(runDir, generationName, artifacts = DEFAULT_RUNNER_LAYOUT.artifacts) {
  const populationPath = resolveRunPath(runDir, generationName, artifacts.population);
  let contents;
  try {
    contents = await readFile(populationPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Missing population.jsonl at ${populationPath}`);
    }
    throw error;
  }

  const records = parseJsonlWithLineNumbers(contents, populationPath);
  if (!records.length) {
    throw new Error(`population.jsonl at ${populationPath} is empty.`);
  }

  return records.map(({ value, line }) => normalizePopulationEntry(value, populationPath, line));
}

async function loadPreferenceController(runDir, generationName) {
  const controllerPath = resolveRunPath(runDir, generationName, "preference-controller.json");
  let contents;
  try {
    contents = await readFile(controllerPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { mode: "learning", stableGenCount: 0 };
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`preference-controller.json corrupt at ${controllerPath}: ${message}`);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed.mode !== "learning" && parsed.mode !== "frozen") ||
    !Number.isInteger(parsed.stableGenCount)
  ) {
    throw new Error(`preference-controller.json invalid structure at ${controllerPath}`);
  }

  return { mode: parsed.mode, stableGenCount: parsed.stableGenCount };
}

async function loadPreferenceModel(runDir, generationName, artifacts = DEFAULT_RUNNER_LAYOUT.artifacts) {
  const modelPath = resolveRunPath(runDir, generationName, artifacts.preferenceModel);
  let snapshots;
  try {
    snapshots = await readPreferenceModelSnapshotJsonl(modelPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Missing preference-model.jsonl at ${modelPath}`);
    }
    throw error;
  }

  if (!snapshots.length) {
    throw new Error(`preference-model.jsonl at ${modelPath} is empty.`);
  }

  return snapshots[snapshots.length - 1];
}

export async function loadResumeState({
  baseDir = process.cwd(),
  runId,
  config,
  artifacts = DEFAULT_RUNNER_LAYOUT.artifacts,
  resumeConfig = DEFAULT_RUNNER_LAYOUT.resume,
}) {
  assertValidRunId(runId);

  const runDir = resolveRunDir(baseDir, runId);
  let runStats;
  try {
    runStats = await stat(runDir);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Run directory does not exist for '${runId}'.`);
    }
    throw error;
  }
  if (!runStats.isDirectory()) {
    throw new Error(`Run path is not a directory for '${runId}'.`);
  }

  const metadata = await loadRunMetadata(runDir, runId, artifacts);
  assertConfigCompatibility(metadata.config, config, resumeConfig);

  const { generation, generationDir, generationName } = await findLatestGeneration(runDir, runId);

  const population = await loadPopulation(runDir, generationName, artifacts);
  const preferenceModel = await loadPreferenceModel(runDir, generationName, artifacts);
  const preferenceController = await loadPreferenceController(runDir, generationName);

  return {
    runId,
    runDir,
    generation,
    generationDir,
    population,
    preferenceModel,
    preferenceController,
    runConfig: metadata.config,
  };
}
