import { readFile, writeFile } from "node:fs/promises";
import { parseJsonl, stableStringify, stringifyJsonl } from "./jsonl.js";

const REQUIRED_METADATA = ["id", "version", "createdAt"];

function assertRequiredMetadata(record, label) {
  const missing = REQUIRED_METADATA.filter(
    (key) => typeof record?.[key] !== "string" || record[key].trim().length === 0,
  );

  if (missing.length) {
    throw new Error(`${label} missing required metadata: ${missing.join(", ")}`);
  }
}

function assertRequiredObject(record, key, label) {
  if (
    !record ||
    typeof record[key] !== "object" ||
    record[key] === null ||
    Array.isArray(record[key])
  ) {
    throw new Error(`${label} missing required field: ${key}`);
  }
}

function assertOptionalString(record, key, label) {
  if (key in record) {
    if (typeof record[key] !== "string") {
      throw new Error(`${label} ${key} must be a string`);
    }
    if (record[key].trim().length === 0) {
      throw new Error(`${label} ${key} must be a non-empty string`);
    }
  }
}

function assertOptionalNumber(record, key, label) {
  if (key in record && !Number.isFinite(record[key])) {
    throw new Error(`${label} ${key} must be a number`);
  }
}

function toPreferenceModelSnapshotEnvelope(record) {
  assertRequiredMetadata(record, "PreferenceModelSnapshotRecord");
  assertRequiredObject(record, "trainingWindow", "PreferenceModelSnapshotRecord");
  assertRequiredObject(record, "hyperparams", "PreferenceModelSnapshotRecord");
  assertRequiredObject(record, "metrics", "PreferenceModelSnapshotRecord");
  assertRequiredObject(record, "weights", "PreferenceModelSnapshotRecord");
  assertOptionalString(record, "contextTag", "PreferenceModelSnapshotRecord");
  assertOptionalNumber(record, "bias", "PreferenceModelSnapshotRecord");
  return {
    type: "preference-model-snapshot",
    payload: record,
  };
}

function parsePreferenceModelSnapshotEnvelope(raw) {
  if (!raw || raw.type !== "preference-model-snapshot" || !raw.payload) {
    throw new Error("JSONL line is not a preference-model-snapshot envelope");
  }

  assertRequiredMetadata(raw.payload, "PreferenceModelSnapshotRecord");
  assertRequiredObject(raw.payload, "trainingWindow", "PreferenceModelSnapshotRecord");
  assertRequiredObject(raw.payload, "hyperparams", "PreferenceModelSnapshotRecord");
  assertRequiredObject(raw.payload, "metrics", "PreferenceModelSnapshotRecord");
  assertRequiredObject(raw.payload, "weights", "PreferenceModelSnapshotRecord");
  assertOptionalString(raw.payload, "contextTag", "PreferenceModelSnapshotRecord");
  assertOptionalNumber(raw.payload, "bias", "PreferenceModelSnapshotRecord");
  return raw;
}

export function serializePreferenceModelSnapshotRecord(record) {
  return stableStringify(toPreferenceModelSnapshotEnvelope(record));
}

export async function writePreferenceModelSnapshotJsonl(filePath, records) {
  const envelopes = records.map(toPreferenceModelSnapshotEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readPreferenceModelSnapshotJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records
    .map(parsePreferenceModelSnapshotEnvelope)
    .map((entry) => entry.payload);
}
