import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readGameDefinitionJsonl,
  serializeGameDefinitionRecord,
  writeGameDefinitionJsonl,
} from "../../../src/data-persistence/game-definition-store.js";

const definition = {
  version: "0.1.0",
  players: { count: 2 },
  actions: [],
  state: { variables: [] },
  termination: { conditions: [] },
  turn: { scheduler: "round_robin" },
};

function createRecord(overrides = {}) {
  return {
    id: "game-1",
    version: "1.0",
    createdAt: "2025-01-01T00:00:00Z",
    definition,
    descriptors: {
      name: "Sample",
      tags: ["beta", "alpha", "beta"],
    },
    ...overrides,
  };
}

test("writes and reads normalized game definition JSONL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "games.jsonl");

  await writeGameDefinitionJsonl(filePath, [createRecord()]);

  const records = await readGameDefinitionJsonl(filePath);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].descriptors.tags, ["alpha", "beta"]);
});

test("serialization is deterministic for the same logical record", async () => {
  const recordA = createRecord({
    definition: {
      players: { count: 2 },
      version: "0.1.0",
      state: { variables: [] },
      actions: [],
      termination: { conditions: [] },
      turn: { scheduler: "round_robin" },
    },
  });

  const recordB = {
    version: "1.0",
    id: "game-1",
    createdAt: "2025-01-01T00:00:00Z",
    descriptors: { tags: ["alpha", "beta"], name: "Sample" },
    definition,
  };

  const serializedA = serializeGameDefinitionRecord(recordA);
  const serializedB = serializeGameDefinitionRecord(recordB);

  assert.equal(serializedA, serializedB);
});

test("rejects missing required metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
  const filePath = join(dir, "games.jsonl");

  await assert.rejects(
    () => writeGameDefinitionJsonl(filePath, [createRecord({ id: "" })]),
    /required metadata: id/i,
  );

  assert.throws(
    () => serializeGameDefinitionRecord(createRecord({ version: "" })),
    /required metadata: version/i,
  );
});
