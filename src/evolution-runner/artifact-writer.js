import { mkdir, writeFile } from "node:fs/promises";
import { stringifyJsonl } from "../data-persistence/jsonl.js";
import { writeFeedbackJsonl } from "../data-persistence/feedback-store.js";
import { writePreferenceModelSnapshotJsonl } from "../data-persistence/preference-model-store.js";
import { assertValidRunId, resolveRunDir, resolveRunPath } from "./run-layout.js";
import { DEFAULT_RUNNER_LAYOUT, formatGenerationDirName } from "./runner-defaults.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertNonEmptyArray(value, label) {
  assertArray(value, label);
  if (value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

function normalizePopulationEntry(entry, index) {
  if (!isPlainObject(entry)) {
    throw new Error(`Population entry ${index} is not an object.`);
  }

  const { id, definition } = entry;
  assertNonEmptyString(id, `Population entry ${index} id`);

  if (!isPlainObject(definition)) {
    throw new Error(`Population entry ${index} definition must be an object.`);
  }

  return { id, definition };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonl(filePath, records) {
  const contents = stringifyJsonl(records);
  await writeFile(filePath, contents, "utf8");
}

function assertGenerationNumber(generation) {
  if (!Number.isInteger(generation) || generation < 0) {
    throw new Error("Generation must be a non-negative integer");
  }
}

export async function writeGenerationArtifacts({
  baseDir = process.cwd(),
  runId,
  generation,
  population,
  evaluated,
  rejected,
  mapElites,
  shortlist,
  feedback,
  preferenceModelSnapshots,
  determinism,
  operatorStats,
  health,
  preferenceMetrics,
  preferenceController,
  preferenceHealth,
  tasteVector,
  debugLog,
  artifacts = DEFAULT_RUNNER_LAYOUT.artifacts,
}) {
  assertValidRunId(runId);
  assertGenerationNumber(generation);
  assertNonEmptyArray(population, "Population");
  assertNonEmptyArray(preferenceModelSnapshots, "Preference model snapshots");

  const normalizedPopulation = population.map((entry, index) =>
    normalizePopulationEntry(entry, index),
  );

  const runDir = resolveRunDir(baseDir, runId);
  const generationName = formatGenerationDirName(artifacts.generationDirPattern, generation);
  const generationDir = resolveRunPath(runDir, generationName);

  await mkdir(generationDir, { recursive: true });

  const populationPath = resolveRunPath(generationDir, artifacts.population);
  await writeJsonl(populationPath, normalizedPopulation);

  const preferenceModelPath = resolveRunPath(generationDir, artifacts.preferenceModel);
  await writePreferenceModelSnapshotJsonl(preferenceModelPath, preferenceModelSnapshots);

  const paths = {
    generationDir,
    populationPath,
    preferenceModelPath,
  };

  if (evaluated !== undefined) {
    assertArray(evaluated, "Evaluated entries");
    const evaluatedPath = resolveRunPath(generationDir, artifacts.evaluated);
    await writeJsonl(evaluatedPath, evaluated);
    paths.evaluatedPath = evaluatedPath;
  }

  if (rejected !== undefined) {
    assertArray(rejected, "Rejected entries");
    const rejectedPath = resolveRunPath(generationDir, artifacts.rejected);
    await writeJsonl(rejectedPath, rejected);
    paths.rejectedPath = rejectedPath;
  }

  if (mapElites !== undefined) {
    const mapElitesPath = resolveRunPath(generationDir, artifacts.mapElites);
    await writeJson(mapElitesPath, mapElites);
    paths.mapElitesPath = mapElitesPath;
  }

  if (Array.isArray(shortlist) && shortlist.length > 0) {
    const shortlistPath = resolveRunPath(generationDir, artifacts.shortlist);
    await writeJson(shortlistPath, shortlist);
    paths.shortlistPath = shortlistPath;
  }

  if (feedback !== undefined) {
    assertArray(feedback, "Feedback entries");
    const feedbackPath = resolveRunPath(generationDir, artifacts.feedback);
    await writeFeedbackJsonl(feedbackPath, feedback);
    paths.feedbackPath = feedbackPath;
  }

  if (determinism !== undefined) {
    if (!isPlainObject(determinism)) {
      throw new Error("Determinism metadata must be an object");
    }
    const determinismPath = resolveRunPath(generationDir, artifacts.determinism);
    await writeJson(determinismPath, {
      runId,
      generation,
      createdAt: new Date().toISOString(),
      ...determinism,
    });
    paths.determinismPath = determinismPath;
  }

  if (operatorStats !== undefined) {
    if (!isPlainObject(operatorStats)) {
      throw new Error("Operator stats must be an object");
    }
    const operatorStatsPath = resolveRunPath(generationDir, "operator-stats.json");
    await writeJson(operatorStatsPath, operatorStats);
    paths.operatorStatsPath = operatorStatsPath;
  }

  if (health !== undefined) {
    if (!isPlainObject(health)) {
      throw new Error("Health metrics must be an object");
    }
    const healthPath = resolveRunPath(generationDir, "health.json");
    await writeJson(healthPath, health);
    paths.healthPath = healthPath;
  }

  if (preferenceMetrics !== undefined) {
    if (!isPlainObject(preferenceMetrics)) {
      throw new Error("Preference metrics must be an object");
    }
    const preferenceMetricsPath = resolveRunPath(generationDir, "preference-metrics.json");
    await writeJson(preferenceMetricsPath, preferenceMetrics);
    paths.preferenceMetricsPath = preferenceMetricsPath;
  }

  if (preferenceController !== undefined) {
    if (!isPlainObject(preferenceController)) {
      throw new Error("Preference controller must be an object");
    }
    const preferenceControllerPath = resolveRunPath(generationDir, "preference-controller.json");
    await writeJson(preferenceControllerPath, preferenceController);
    paths.preferenceControllerPath = preferenceControllerPath;
  }

  if (preferenceHealth !== undefined) {
    if (!isPlainObject(preferenceHealth)) {
      throw new Error("Preference health must be an object");
    }
    const preferenceHealthPath = resolveRunPath(generationDir, "preference-health.json");
    await writeJson(preferenceHealthPath, preferenceHealth);
    paths.preferenceHealthPath = preferenceHealthPath;
  }

  if (tasteVector !== undefined) {
    if (!isPlainObject(tasteVector)) {
      throw new Error("Taste vector must be an object");
    }
    const tasteVectorPath = resolveRunPath(generationDir, "taste-vector.json");
    await writeJson(tasteVectorPath, tasteVector);
    paths.tasteVectorPath = tasteVectorPath;
  }

  if (debugLog !== undefined) {
    if (!isPlainObject(debugLog)) {
      throw new Error("Debug log must be an object");
    }
    const debugLogPath = resolveRunPath(generationDir, "debug-log.json");
    await writeJson(debugLogPath, debugLog);
    paths.debugLogPath = debugLogPath;
  }

  return paths;
}

export async function writeSeedReport({ baseDir = process.cwd(), runId, report }) {
  assertValidRunId(runId);
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Seed report must be a plain object");
  }

  const runDir = resolveRunDir(baseDir, runId);
  await mkdir(runDir, { recursive: true });

  const seedReportPath = resolveRunPath(runDir, "seed-report.json");
  await writeJson(seedReportPath, report);

  return { seedReportPath };
}
