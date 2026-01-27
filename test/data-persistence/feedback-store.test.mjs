import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readFeedbackJsonl,
  serializeFeedbackRecord,
  writeFeedbackJsonl,
} from "../../src/data-persistence/feedback-store.js";

const base = {
  id: "feedback-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:00Z",
};

const ratingFeedback = {
  ...base,
  feedback: {
    type: "rating",
    rating: 4,
    featureVector: { agency: 0.75 },
  },
  tags: ["ux", "balance", "ux"],
  rationale: " ",
};

const comparisonFeedback = {
  ...base,
  id: "feedback-2",
  feedback: {
    type: "comparison",
    preferred: "a",
    featureA: { agency: 0.8 },
    featureB: { agency: 0.6 },
  },
};

const comparisonFeedbackWithMetadata = {
  ...comparisonFeedback,
  id: "feedback-3",
  feedback: {
    ...comparisonFeedback.feedback,
    gameAId: "game-1",
    gameBId: "game-2",
    winnerId: "game-1",
    userId: "user-9",
    contextTag: "quick",
    confidence: 0.82,
    notes: "Preferred higher agency.",
  },
};

test("writes and reads normalized feedback JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "feedback.jsonl");

  await writeFeedbackJsonl(filePath, [ratingFeedback]);

  const records = await readFeedbackJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].tags, ["balance", "ux"]);
  assert.equal(records[0].rationale, undefined);
});

test("serialization is deterministic for the same logical feedback record", async () => {
  const recordA = {
    ...ratingFeedback,
    tags: ["balance", "ux"],
    rationale: undefined,
  };

  const recordB = {
    feedback: {
      featureVector: { agency: 0.75 },
      rating: 4,
      type: "rating",
    },
    createdAt: "2025-01-01T00:00:00Z",
    version: "1.0",
    id: "feedback-1",
    tags: ["ux", "balance"],
  };

  const serializedA = serializeFeedbackRecord(recordA);
  const serializedB = serializeFeedbackRecord(recordB);

  assert.equal(serializedA, serializedB);
});

test("writes and reads comparison feedback JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "feedback.jsonl");

  await writeFeedbackJsonl(filePath, [comparisonFeedback]);

  const records = await readFeedbackJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], comparisonFeedback);
});

test("writes and reads comparison feedback metadata JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "feedback.jsonl");

  await writeFeedbackJsonl(filePath, [comparisonFeedbackWithMetadata]);

  const records = await readFeedbackJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], comparisonFeedbackWithMetadata);
});

test("rejects missing required fields and invalid feedback samples", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "feedback.jsonl");

  await assert.rejects(
    () => writeFeedbackJsonl(filePath, [{ ...ratingFeedback, id: "" }]),
    /required metadata: id/i,
  );

  assert.throws(
    () => serializeFeedbackRecord({ ...ratingFeedback, version: "" }),
    /required metadata: version/i,
  );

  await assert.rejects(
    () =>
      writeFeedbackJsonl(filePath, [
        {
          ...ratingFeedback,
          feedback: { type: "rating", rating: 3 },
        },
      ]),
    /requires featureVector/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: { type: "comparison", preferred: "c", featureA: {}, featureB: {} },
      }),
    /invalid preferred/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: { ...comparisonFeedback.feedback, confidence: "high" },
      }),
    /confidence must be a number/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: { ...comparisonFeedback.feedback, confidence: 1.5 },
      }),
    /confidence must be between 0 and 1/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: { ...comparisonFeedback.feedback, gameAId: " " },
      }),
    /gameAId must be a non-empty string/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: {
          ...comparisonFeedback.feedback,
          gameAId: "game-1",
          gameBId: "game-1",
        },
      }),
    /gameAId and gameBId must differ/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: {
          ...comparisonFeedback.feedback,
          gameAId: "game-1",
          gameBId: "game-2",
          winnerId: "game-3",
        },
      }),
    /winnerId must match gameAId or gameBId/i,
  );

  assert.throws(
    () =>
      serializeFeedbackRecord({
        ...comparisonFeedback,
        feedback: {
          ...comparisonFeedback.feedback,
          winnerId: "game-1",
        },
      }),
    /winnerId requires gameAId and gameBId/i,
  );
});
