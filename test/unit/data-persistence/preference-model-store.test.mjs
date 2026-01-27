import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readPreferenceModelSnapshotJsonl,
  serializePreferenceModelSnapshotRecord,
  writePreferenceModelSnapshotJsonl,
} from "../../../src/data-persistence/preference-model-store.js";

const base = {
  id: "model-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:00Z",
};

const snapshotRecord = {
  ...base,
  trainingWindow: {
    start: "2024-12-01T00:00:00Z",
    end: "2025-01-01T00:00:00Z",
    sampleCount: 12,
  },
  contextTag: "quick",
  hyperparams: {
    learningRate: 0.05,
    comparisonWeight: 1,
    ratingWeight: 0.25,
    weightDecay: 0,
    maxWeightAbs: 5,
    maxBiasAbs: 5,
    regularization: "l2",
  },
  metrics: {
    accuracy: 0.82,
    calibration: 0.74,
  },
  weights: {
    agency: 0.6,
    tension: -0.2,
  },
  bias: 0.1,
};

test("writes and reads preference model snapshot JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "preference-model.jsonl");

  await writePreferenceModelSnapshotJsonl(filePath, [snapshotRecord]);

  const records = await readPreferenceModelSnapshotJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], snapshotRecord);
});

test("serialization is deterministic for the same logical snapshot", async () => {
  const recordA = {
    ...snapshotRecord,
  };

  const recordB = {
    metrics: {
      calibration: 0.74,
      accuracy: 0.82,
    },
    hyperparams: {
      regularization: "l2",
      learningRate: 0.05,
      comparisonWeight: 1,
      ratingWeight: 0.25,
      weightDecay: 0,
      maxWeightAbs: 5,
      maxBiasAbs: 5,
    },
    trainingWindow: {
      end: "2025-01-01T00:00:00Z",
      sampleCount: 12,
      start: "2024-12-01T00:00:00Z",
    },
    weights: {
      tension: -0.2,
      agency: 0.6,
    },
    contextTag: "quick",
    bias: 0.1,
    createdAt: "2025-01-01T00:00:00Z",
    version: "1.0",
    id: "model-1",
  };

  const serializedA = serializePreferenceModelSnapshotRecord(recordA);
  const serializedB = serializePreferenceModelSnapshotRecord(recordB);

  assert.equal(serializedA, serializedB);
});

test("rejects missing required fields and invalid snapshot metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "preference-model.jsonl");

  await assert.rejects(
    () => writePreferenceModelSnapshotJsonl(filePath, [{ ...snapshotRecord, id: "" }]),
    /required metadata: id/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        trainingWindow: null,
      }),
    /missing required field: trainingWindow/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        hyperparams: [],
      }),
    /missing required field: hyperparams/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        metrics: "high",
      }),
    /missing required field: metrics/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        weights: [],
      }),
    /missing required field: weights/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        contextTag: " ",
      }),
    /contextTag must be a non-empty string/i,
  );

  assert.throws(
    () =>
      serializePreferenceModelSnapshotRecord({
        ...snapshotRecord,
        bias: "high",
      }),
    /bias must be a number/i,
  );
});
