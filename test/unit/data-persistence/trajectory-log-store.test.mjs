import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyTrajectoryLogRetention,
  readTrajectoryLogJsonl,
  serializeTrajectoryLogRecord,
  writeTrajectoryLogJsonl,
} from "../../../src/data-persistence/trajectory-log-store.js";

const state = {
  variables: {
    global: {},
    perPlayer: {
      1: { score: 0 },
      2: { score: 0 },
    },
  },
  tokens: {},
  zones: {},
  agents: [
    { id: 1, variables: {} },
    { id: 2, variables: {} },
  ],
  turn: { currentPlayer: 1, phase: null, turn: 1 },
  nextTokenId: 1,
};

const trajectory = {
  steps: [
    {
      turn: 1,
      phase: null,
      playerId: 1,
      actionId: "pass",
      legalActionCount: 1,
      state,
    },
  ],
};

const baseRecord = {
  id: "trajectory-1",
  version: "1.0",
  createdAt: "2025-01-01T00:00:00Z",
  engineVersion: "engine-0.1.0",
  seed: 42,
  gameId: "game-1",
  runId: "run-1",
  trajectory,
};

test("writes and reads trajectory log JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "trajectory.jsonl");

  await writeTrajectoryLogJsonl(filePath, [baseRecord]);

  const records = await readTrajectoryLogJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], baseRecord);
});

test("serialization is deterministic for equivalent trajectory records", () => {
  const recordA = {
    ...baseRecord,
    trajectory: {
      steps: [
        {
          actionId: "pass",
          playerId: 1,
          phase: null,
          legalActionCount: 1,
          turn: 1,
          state,
        },
      ],
    },
  };

  const recordB = {
    runId: "run-1",
    gameId: "game-1",
    createdAt: "2025-01-01T00:00:00Z",
    id: "trajectory-1",
    version: "1.0",
    engineVersion: "engine-0.1.0",
    seed: 42,
    trajectory,
  };

  const serializedA = serializeTrajectoryLogRecord(recordA);
  const serializedB = serializeTrajectoryLogRecord(recordB);

  assert.equal(serializedA, serializedB);
});

test("rejects missing required fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "trajectory.jsonl");

  await assert.rejects(
    () => writeTrajectoryLogJsonl(filePath, [{ ...baseRecord, gameId: "" }]),
    /required field: gameId/i,
  );

  await assert.rejects(
    () => writeTrajectoryLogJsonl(filePath, [{ ...baseRecord, runId: "" }]),
    /required field: runId/i,
  );

  assert.throws(
    () => serializeTrajectoryLogRecord({ ...baseRecord, version: "" }),
    /required metadata: version/i,
  );
});

test("retention policy keeps the most recent records", () => {
  const records = [
    { ...baseRecord, id: "trajectory-1", runId: "run-1" },
    { ...baseRecord, id: "trajectory-2", runId: "run-2" },
    { ...baseRecord, id: "trajectory-3", runId: "run-3" },
  ];

  const retained = applyTrajectoryLogRetention(records, { maxEntries: 2 });
  assert.deepEqual(
    retained.map((record) => record.id),
    ["trajectory-2", "trajectory-3"],
  );
});

test("retention policy respects size caps", () => {
  const records = [
    { ...baseRecord, id: "trajectory-1", runId: "run-1" },
    { ...baseRecord, id: "trajectory-2", runId: "run-2" },
  ];

  const singleSize = Buffer.byteLength(
    `${serializeTrajectoryLogRecord(records[1])}\n`,
    "utf8",
  );

  const retained = applyTrajectoryLogRetention(records, { maxBytes: singleSize });
  assert.deepEqual(retained.map((record) => record.id), ["trajectory-2"]);
});
