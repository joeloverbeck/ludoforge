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

function assertTrajectory(record, label) {
  if (!record?.trajectory || typeof record.trajectory !== "object") {
    throw new Error(`${label} missing required field: trajectory`);
  }
}

function toTrajectoryLogEnvelope(record) {
  assertRequiredMetadata(record, "TrajectoryLogRecord");
  assertRequiredString(record, "gameId", "TrajectoryLogRecord");
  assertRequiredString(record, "runId", "TrajectoryLogRecord");
  assertTrajectory(record, "TrajectoryLogRecord");
  return {
    type: "trajectory-log",
    payload: record,
  };
}

function parseTrajectoryLogEnvelope(raw) {
  if (!raw || raw.type !== "trajectory-log" || !raw.payload) {
    throw new Error("JSONL line is not a trajectory-log envelope");
  }

  assertRequiredMetadata(raw.payload, "TrajectoryLogRecord");
  assertRequiredString(raw.payload, "gameId", "TrajectoryLogRecord");
  assertRequiredString(raw.payload, "runId", "TrajectoryLogRecord");
  assertTrajectory(raw.payload, "TrajectoryLogRecord");
  return raw;
}

function trajectoryLogEnvelopeSize(record) {
  const line = `${stableStringify(toTrajectoryLogEnvelope(record))}\n`;
  return Buffer.byteLength(line, "utf8");
}

export function serializeTrajectoryLogRecord(record) {
  return stableStringify(toTrajectoryLogEnvelope(record));
}

export async function writeTrajectoryLogJsonl(filePath, records) {
  const envelopes = records.map(toTrajectoryLogEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readTrajectoryLogJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseTrajectoryLogEnvelope).map((entry) => entry.payload);
}

export function applyTrajectoryLogRetention(records, { maxEntries, maxBytes } = {}) {
  let retained = records;

  if (Number.isInteger(maxEntries) && maxEntries >= 0) {
    retained = retained.slice(Math.max(0, retained.length - maxEntries));
  }

  if (Number.isInteger(maxBytes) && maxBytes >= 0) {
    let total = 0;
    const kept = [];
    for (let index = retained.length - 1; index >= 0; index -= 1) {
      const record = retained[index];
      const size = trajectoryLogEnvelopeSize(record);
      if (total + size > maxBytes) {
        break;
      }
      total += size;
      kept.push(record);
    }
    retained = kept.reverse();
  }

  return retained;
}
