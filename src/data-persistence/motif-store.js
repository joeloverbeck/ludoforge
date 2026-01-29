import { readFile, writeFile } from "node:fs/promises";
import { parseJsonl, stableStringify, stringifyJsonl } from "./jsonl.js";

const REQUIRED_METADATA = ["id", "version", "createdAt"];
const REQUIRED_DOMAIN_FIELDS = ["signature", "support"];

function assertRequiredMetadata(record, label) {
  const missing = REQUIRED_METADATA.filter(
    (key) => typeof record?.[key] !== "string" || record[key].trim().length === 0,
  );

  if (missing.length) {
    throw new Error(`${label} missing required metadata: ${missing.join(", ")}`);
  }
}

function assertRequiredDomainFields(record, label) {
  if (typeof record?.signature !== "string" || record.signature.trim().length === 0) {
    throw new Error(`${label} missing required field: signature`);
  }
  if (typeof record?.support !== "number" || !Number.isFinite(record.support)) {
    throw new Error(`${label} missing required field: support`);
  }
}

function toMotifEnvelope(record) {
  assertRequiredMetadata(record, "MotifRecord");
  assertRequiredDomainFields(record, "MotifRecord");
  return {
    type: "motif",
    payload: record,
  };
}

function parseMotifEnvelope(raw) {
  if (!raw || raw.type !== "motif" || !raw.payload) {
    throw new Error("JSONL line is not a motif envelope");
  }

  assertRequiredMetadata(raw.payload, "MotifRecord");
  assertRequiredDomainFields(raw.payload, "MotifRecord");
  return raw;
}

export function serializeMotifRecord(record) {
  return stableStringify(toMotifEnvelope(record));
}

export async function writeMotifJsonl(filePath, records) {
  const envelopes = records.map(toMotifEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readMotifJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseMotifEnvelope).map((entry) => entry.payload);
}
