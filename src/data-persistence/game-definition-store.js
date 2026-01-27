import { readFile, writeFile } from "node:fs/promises";
import { parseJsonl, stableStringify, stringifyJsonl } from "./jsonl.js";

const REQUIRED_METADATA = ["id", "version", "createdAt"];

function assertRequiredMetadata(record) {
  const missing = REQUIRED_METADATA.filter(
    (key) => typeof record?.[key] !== "string" || record[key].trim().length === 0,
  );

  if (missing.length) {
    throw new Error(
      `GameDefinitionRecord missing required metadata: ${missing.join(", ")}`,
    );
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }

  const unique = Array.from(new Set(tags));
  unique.sort();
  return unique;
}

function normalizeDescriptors(descriptors) {
  if (!descriptors) {
    return descriptors;
  }

  return {
    ...descriptors,
    tags: normalizeTags(descriptors.tags),
  };
}

function normalizeGameDefinitionRecord(record) {
  const normalized = {
    ...record,
    descriptors: normalizeDescriptors(record.descriptors),
  };

  if (!normalized.descriptors) {
    delete normalized.descriptors;
  }

  return normalized;
}

function toEnvelope(record) {
  assertRequiredMetadata(record);
  return {
    type: "game-definition",
    payload: normalizeGameDefinitionRecord(record),
  };
}

function parseGameDefinitionEnvelope(raw) {
  if (!raw || raw.type !== "game-definition" || !raw.payload) {
    throw new Error("JSONL line is not a game-definition envelope");
  }

  assertRequiredMetadata(raw.payload);
  return raw;
}

export function serializeGameDefinitionRecord(record) {
  return stableStringify(toEnvelope(record));
}

export async function writeGameDefinitionJsonl(filePath, records) {
  const envelopes = records.map(toEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readGameDefinitionJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseGameDefinitionEnvelope).map((entry) => entry.payload);
}
