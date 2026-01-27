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

function assertRequiredString(record, key, label) {
  if (typeof record?.[key] !== "string" || record[key].trim().length === 0) {
    throw new Error(`${label} missing required field: ${key}`);
  }
}

function toSimulationRunEnvelope(record) {
  assertRequiredMetadata(record, "SimulationRunRecord");
  assertRequiredString(record, "gameId", "SimulationRunRecord");
  return {
    type: "simulation-run",
    payload: record,
  };
}

function parseSimulationRunEnvelope(raw) {
  if (!raw || raw.type !== "simulation-run" || !raw.payload) {
    throw new Error("JSONL line is not a simulation-run envelope");
  }

  assertRequiredMetadata(raw.payload, "SimulationRunRecord");
  assertRequiredString(raw.payload, "gameId", "SimulationRunRecord");
  return raw;
}

function toMetricsEnvelope(record) {
  assertRequiredMetadata(record, "MetricsRecord");
  assertRequiredString(record, "gameId", "MetricsRecord");
  assertRequiredString(record, "runId", "MetricsRecord");
  return {
    type: "metrics",
    payload: record,
  };
}

function parseMetricsEnvelope(raw) {
  if (!raw || raw.type !== "metrics" || !raw.payload) {
    throw new Error("JSONL line is not a metrics envelope");
  }

  assertRequiredMetadata(raw.payload, "MetricsRecord");
  assertRequiredString(raw.payload, "gameId", "MetricsRecord");
  assertRequiredString(raw.payload, "runId", "MetricsRecord");
  return raw;
}

export function serializeSimulationRunRecord(record) {
  return stableStringify(toSimulationRunEnvelope(record));
}

export function serializeMetricsRecord(record) {
  return stableStringify(toMetricsEnvelope(record));
}

export async function writeSimulationRunJsonl(filePath, records) {
  const envelopes = records.map(toSimulationRunEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readSimulationRunJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseSimulationRunEnvelope).map((entry) => entry.payload);
}

export async function writeMetricsJsonl(filePath, records) {
  const envelopes = records.map(toMetricsEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readMetricsJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseMetricsEnvelope).map((entry) => entry.payload);
}
