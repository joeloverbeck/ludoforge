import { mkdir, writeFile } from "node:fs/promises";
import { stringifyJsonl } from "../data-persistence/jsonl.js";
import { writeFeedbackJsonl } from "../data-persistence/feedback-store.js";
import { writePreferenceModelSnapshotJsonl } from "../data-persistence/preference-model-store.js";
import { assertValidRunId, resolveRunDir, resolveRunPath } from "./run-layout.js";

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
}) {
  assertValidRunId(runId);
  assertGenerationNumber(generation);
  assertNonEmptyArray(population, "Population");
  assertNonEmptyArray(preferenceModelSnapshots, "Preference model snapshots");

  const normalizedPopulation = population.map((entry, index) =>
    normalizePopulationEntry(entry, index),
  );

  const runDir = resolveRunDir(baseDir, runId);
  const generationName = `generation-${generation}`;
  const generationDir = resolveRunPath(runDir, generationName);

  await mkdir(generationDir, { recursive: true });

  const populationPath = resolveRunPath(generationDir, "population.jsonl");
  await writeJsonl(populationPath, normalizedPopulation);

  const preferenceModelPath = resolveRunPath(generationDir, "preference-model.jsonl");
  await writePreferenceModelSnapshotJsonl(preferenceModelPath, preferenceModelSnapshots);

  const paths = {
    generationDir,
    populationPath,
    preferenceModelPath,
  };

  if (evaluated !== undefined) {
    assertArray(evaluated, "Evaluated entries");
    const evaluatedPath = resolveRunPath(generationDir, "evaluated.jsonl");
    await writeJsonl(evaluatedPath, evaluated);
    paths.evaluatedPath = evaluatedPath;
  }

  if (rejected !== undefined) {
    assertArray(rejected, "Rejected entries");
    const rejectedPath = resolveRunPath(generationDir, "rejected.jsonl");
    await writeJsonl(rejectedPath, rejected);
    paths.rejectedPath = rejectedPath;
  }

  if (mapElites !== undefined) {
    const mapElitesPath = resolveRunPath(generationDir, "map-elites.json");
    await writeJson(mapElitesPath, mapElites);
    paths.mapElitesPath = mapElitesPath;
  }

  if (shortlist !== undefined) {
    const shortlistPath = resolveRunPath(generationDir, "shortlist.json");
    await writeJson(shortlistPath, shortlist);
    paths.shortlistPath = shortlistPath;
  }

  if (feedback !== undefined) {
    assertArray(feedback, "Feedback entries");
    const feedbackPath = resolveRunPath(generationDir, "feedback.jsonl");
    await writeFeedbackJsonl(feedbackPath, feedback);
    paths.feedbackPath = feedbackPath;
  }

  if (determinism !== undefined) {
    if (!isPlainObject(determinism)) {
      throw new Error("Determinism metadata must be an object");
    }
    const determinismPath = resolveRunPath(generationDir, "determinism.json");
    await writeJson(determinismPath, {
      runId,
      generation,
      createdAt: new Date().toISOString(),
      ...determinism,
    });
    paths.determinismPath = determinismPath;
  }

  return paths;
}
