import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readPreferenceModelSnapshotJsonl,
  serializePreferenceModelSnapshotRecord,
  writePreferenceModelSnapshotJsonl,
} from "../../../src/data-persistence/preference-model-store.js";

describe("preference-model-store", () => {
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
    models: [
      { weights: { agency: 0.6, tension: -0.2 }, bias: 0.1, sampleCount: 6 },
      { weights: { agency: 0.5, tension: -0.1 }, bias: 0.05, sampleCount: 6 },
    ],
    ensemble: { size: 2, method: "online-bagging" },
  };

  describe("writePreferenceModelSnapshotJsonl / readPreferenceModelSnapshotJsonl", () => {
    it("writes and reads preference model snapshot JSONL", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "preference-model.jsonl");

      await writePreferenceModelSnapshotJsonl(filePath, [snapshotRecord]);

      const records = await readPreferenceModelSnapshotJsonl(filePath);
      assert.equal(records.length, 1);
      assert.deepEqual(records[0], snapshotRecord);
    });
  });

  describe("serializePreferenceModelSnapshotRecord", () => {
    it("serialization is deterministic for the same logical snapshot", async () => {
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
        models: [
          { bias: 0.1, sampleCount: 6, weights: { tension: -0.2, agency: 0.6 } },
          { sampleCount: 6, weights: { tension: -0.1, agency: 0.5 }, bias: 0.05 },
        ],
        ensemble: { method: "online-bagging", size: 2 },
        contextTag: "quick",
        createdAt: "2025-01-01T00:00:00Z",
        version: "1.0",
        id: "model-1",
      };

      const serializedA = serializePreferenceModelSnapshotRecord(recordA);
      const serializedB = serializePreferenceModelSnapshotRecord(recordB);

      assert.equal(serializedA, serializedB);
    });
  });

  describe("validation", () => {
    it("rejects missing required fields and invalid snapshot metadata", async () => {
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
            contextTag: " ",
          }),
        /contextTag must be a non-empty string/i,
      );
    });

    it("rejects records missing models array", () => {
      const { models: _, ...withoutModels } = snapshotRecord;

      assert.throws(
        () => serializePreferenceModelSnapshotRecord(withoutModels),
        /missing required field: models/i,
      );

      assert.throws(
        () =>
          serializePreferenceModelSnapshotRecord({
            ...snapshotRecord,
            models: [],
          }),
        /missing required field: models/i,
      );

      assert.throws(
        () =>
          serializePreferenceModelSnapshotRecord({
            ...snapshotRecord,
            models: "not-an-array",
          }),
        /missing required field: models/i,
      );
    });

    it("rejects model entries missing weights or bias", () => {
      assert.throws(
        () =>
          serializePreferenceModelSnapshotRecord({
            ...snapshotRecord,
            models: [{ bias: 0.1, sampleCount: 3 }],
          }),
        /models\[0\] missing required field: weights/i,
      );

      assert.throws(
        () =>
          serializePreferenceModelSnapshotRecord({
            ...snapshotRecord,
            models: [{ weights: { a: 1 }, sampleCount: 3 }],
          }),
        /models\[0\] missing required field: bias/i,
      );

      assert.throws(
        () =>
          serializePreferenceModelSnapshotRecord({
            ...snapshotRecord,
            models: [
              { weights: { a: 1 }, bias: 0.1, sampleCount: 3 },
              { weights: null, bias: 0.2, sampleCount: 3 },
            ],
          }),
        /models\[1\] missing required field: weights/i,
      );
    });

    it("rejects records missing ensemble metadata", () => {
      const { ensemble: _, ...withoutEnsemble } = snapshotRecord;

      assert.throws(
        () => serializePreferenceModelSnapshotRecord(withoutEnsemble),
        /missing required field: ensemble/i,
      );
    });
  });
});
