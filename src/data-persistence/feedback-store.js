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

function assertFeedbackSample(sample) {
  if (!sample || typeof sample !== "object") {
    throw new Error("FeedbackRecord missing required field: feedback");
  }

  const optionalStringFields = [
    "gameAId",
    "gameBId",
    "winnerId",
    "userId",
    "contextTag",
    "notes",
  ];

  if (sample.type === "rating") {
    if (!Number.isFinite(sample.rating)) {
      throw new Error("FeedbackRecord rating feedback requires a numeric rating");
    }
    if (!sample.featureVector || typeof sample.featureVector !== "object") {
      throw new Error("FeedbackRecord rating feedback requires featureVector");
    }
    return;
  }

  if (sample.type === "comparison") {
    if (!["a", "b", "tie"].includes(sample.preferred)) {
      throw new Error("FeedbackRecord comparison feedback has invalid preferred");
    }
    if (!sample.featureA || typeof sample.featureA !== "object") {
      throw new Error("FeedbackRecord comparison feedback requires featureA");
    }
    if (!sample.featureB || typeof sample.featureB !== "object") {
      throw new Error("FeedbackRecord comparison feedback requires featureB");
    }
    for (const field of optionalStringFields) {
      if (field in sample) {
        if (typeof sample[field] !== "string") {
          throw new Error(`FeedbackRecord comparison feedback ${field} must be a string`);
        }
        if (sample[field].trim().length === 0) {
          throw new Error(`FeedbackRecord comparison feedback ${field} must be a non-empty string`);
        }
      }
    }
    if ("confidence" in sample && !Number.isFinite(sample.confidence)) {
      throw new Error("FeedbackRecord comparison feedback confidence must be a number");
    }
    if (
      Number.isFinite(sample.confidence) &&
      (sample.confidence < 0 || sample.confidence > 1)
    ) {
      throw new Error("FeedbackRecord comparison feedback confidence must be between 0 and 1");
    }
    if (
      typeof sample.gameAId === "string" &&
      typeof sample.gameBId === "string" &&
      sample.gameAId === sample.gameBId
    ) {
      throw new Error("FeedbackRecord comparison feedback gameAId and gameBId must differ");
    }
    if (
      typeof sample.winnerId === "string" &&
      (!sample.gameAId || !sample.gameBId)
    ) {
      throw new Error(
        "FeedbackRecord comparison feedback winnerId requires gameAId and gameBId",
      );
    }
    if (
      typeof sample.winnerId === "string" &&
      typeof sample.gameAId === "string" &&
      typeof sample.gameBId === "string" &&
      sample.winnerId !== sample.gameAId &&
      sample.winnerId !== sample.gameBId
    ) {
      throw new Error(
        "FeedbackRecord comparison feedback winnerId must match gameAId or gameBId",
      );
    }
    return;
  }

  throw new Error("FeedbackRecord feedback has invalid type");
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }

  const unique = Array.from(new Set(tags));
  unique.sort();
  return unique;
}

function normalizeFeedbackRecord(record) {
  const normalized = {
    ...record,
    tags: normalizeTags(record.tags),
  };

  if (typeof normalized.rationale === "string" && normalized.rationale.trim().length === 0) {
    delete normalized.rationale;
  }

  if (!normalized.tags) {
    delete normalized.tags;
  }

  return normalized;
}

function toFeedbackEnvelope(record) {
  assertRequiredMetadata(record, "FeedbackRecord");
  assertFeedbackSample(record.feedback);
  return {
    type: "feedback",
    payload: normalizeFeedbackRecord(record),
  };
}

function parseFeedbackEnvelope(raw) {
  if (!raw || raw.type !== "feedback" || !raw.payload) {
    throw new Error("JSONL line is not a feedback envelope");
  }

  assertRequiredMetadata(raw.payload, "FeedbackRecord");
  assertFeedbackSample(raw.payload.feedback);
  return raw;
}

export function serializeFeedbackRecord(record) {
  return stableStringify(toFeedbackEnvelope(record));
}

export async function writeFeedbackJsonl(filePath, records) {
  const envelopes = records.map(toFeedbackEnvelope);
  const contents = stringifyJsonl(envelopes);
  await writeFile(filePath, contents, "utf8");
}

export async function readFeedbackJsonl(filePath) {
  const contents = await readFile(filePath, "utf8");
  if (!contents.trim()) {
    return [];
  }

  const records = parseJsonl(contents);
  return records.map(parseFeedbackEnvelope).map((entry) => entry.payload);
}
