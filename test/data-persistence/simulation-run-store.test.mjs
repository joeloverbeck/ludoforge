import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readMetricsJsonl,
  readSimulationRunJsonl,
  serializeMetricsRecord,
  serializeSimulationRunRecord,
  writeMetricsJsonl,
  writeSimulationRunJsonl,
} from "../../src/data-persistence/simulation-run-store.js";

const summary = {
  stepCount: 1,
  turnCount: 1,
  terminalOutcome: {
    terminated: true,
    reason: "condition",
    outcomes: { 1: "draw" },
  },
  terminationReason: "condition",
  actionCounts: { pass: 1 },
  uniqueStateCount: 1,
};

const runRecord = {
  id: "run-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:00Z",
  engineVersion: "engine-0.1.0",
  seed: 123,
  gameId: "game-1",
  agents: [{ kind: "random", id: 1 }],
  summary,
};

const metricsRecord = {
  id: "metrics-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:01Z",
  engineVersion: "engine-0.1.0",
  seed: 123,
  gameId: "game-1",
  runId: "run-1",
  metrics: [{ id: "agency", value: 0.75 }],
  featureVector: { agency: 0.75 },
};

test("writes and reads simulation run JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "runs.jsonl");

  await writeSimulationRunJsonl(filePath, [runRecord]);

  const records = await readSimulationRunJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], runRecord);
});

test("writes and reads metrics JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "metrics.jsonl");

  await writeMetricsJsonl(filePath, [metricsRecord]);

  const records = await readMetricsJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], metricsRecord);
});

test("serialization is deterministic for the same logical run record", async () => {
  const recordA = {
    ...runRecord,
    summary: {
      terminationReason: "condition",
      terminalOutcome: summary.terminalOutcome,
      actionCounts: { pass: 1 },
      uniqueStateCount: 1,
      stepCount: 1,
      turnCount: 1,
    },
  };

  const recordB = {
    version: "1.0",
    id: "run-1",
    createdAt: "2025-01-01T00:00:00Z",
    seed: 123,
    engineVersion: "engine-0.1.0",
    gameId: "game-1",
    agents: [{ kind: "random", id: 1 }],
    summary,
  };

  const serializedA = serializeSimulationRunRecord(recordA);
  const serializedB = serializeSimulationRunRecord(recordB);

  assert.equal(serializedA, serializedB);
});

test("rejects missing required fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const runPath = join(dir, "runs.jsonl");
  const metricsPath = join(dir, "metrics.jsonl");

  await assert.rejects(
    () => writeSimulationRunJsonl(runPath, [{ ...runRecord, gameId: "" }]),
    /required field: gameId/i,
  );

  assert.throws(
    () => serializeSimulationRunRecord({ ...runRecord, version: "" }),
    /required metadata: version/i,
  );

  await assert.rejects(
    () => writeMetricsJsonl(metricsPath, [{ ...metricsRecord, runId: "" }]),
    /required field: runId/i,
  );

  assert.throws(
    () => serializeMetricsRecord({ ...metricsRecord, id: "" }),
    /required metadata: id/i,
  );
});
