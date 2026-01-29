import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readMotifJsonl,
  serializeMotifRecord,
  writeMotifJsonl,
} from "../../../src/data-persistence/motif-store.js";

describe("motif-store", () => {
  const baseRecord = {
    id: "motif-1",
    version: "1.0",
    createdAt: "2025-01-01T00:00:00Z",
    signature: "a → b",
    ngramSize: 2,
    support: 5,
    exampleOccurrences: [{ fromNode: "n0", path: ["a", "b"] }],
  };

  describe("writeMotifJsonl / readMotifJsonl", () => {
    it("round-trip: write then read returns identical array", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "motifs.jsonl");

      await writeMotifJsonl(filePath, [baseRecord]);

      const records = await readMotifJsonl(filePath);
      assert.equal(records.length, 1);
      assert.deepEqual(records[0], baseRecord);
    });

    it("round-trips multiple records", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "motifs.jsonl");

      const records = [
        baseRecord,
        { ...baseRecord, id: "motif-2", signature: "c → d", support: 3 },
      ];

      await writeMotifJsonl(filePath, records);

      const result = await readMotifJsonl(filePath);
      assert.equal(result.length, 2);
      assert.deepEqual(result, records);
    });
  });

  describe("serializeMotifRecord", () => {
    it("deterministic serialization for equivalent records", () => {
      const recordA = {
        ...baseRecord,
        exampleOccurrences: [{ path: ["a", "b"], fromNode: "n0" }],
      };

      const recordB = {
        support: 5,
        signature: "a → b",
        createdAt: "2025-01-01T00:00:00Z",
        id: "motif-1",
        version: "1.0",
        ngramSize: 2,
        exampleOccurrences: [{ fromNode: "n0", path: ["a", "b"] }],
      };

      const serializedA = serializeMotifRecord(recordA);
      const serializedB = serializeMotifRecord(recordB);

      assert.equal(serializedA, serializedB);
    });
  });

  describe("validation", () => {
    it("rejects records missing required metadata", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "motifs.jsonl");

      await assert.rejects(
        () => writeMotifJsonl(filePath, [{ ...baseRecord, id: "" }]),
        /required metadata: id/i,
      );

      assert.throws(
        () => serializeMotifRecord({ ...baseRecord, version: "" }),
        /required metadata: version/i,
      );

      assert.throws(
        () => serializeMotifRecord({ ...baseRecord, createdAt: "" }),
        /required metadata: createdAt/i,
      );
    });

    it("rejects records missing domain fields (signature)", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "motifs.jsonl");

      await assert.rejects(
        () => writeMotifJsonl(filePath, [{ ...baseRecord, signature: "" }]),
        /required field: signature/i,
      );
    });

    it("rejects records missing domain fields (support)", () => {
      const { support: _, ...noSupport } = baseRecord;

      assert.throws(
        () => serializeMotifRecord(noSupport),
        /required field: support/i,
      );
    });
  });

  describe("edge cases", () => {
    it("empty file read returns empty array", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const filePath = join(dir, "motifs.jsonl");
      await writeFile(filePath, "", "utf8");

      const result = await readMotifJsonl(filePath);
      assert.deepEqual(result, []);
    });

    it("follows JSONL envelope pattern (type: motif)", () => {
      const serialized = serializeMotifRecord(baseRecord);
      const parsed = JSON.parse(serialized);

      assert.equal(parsed.type, "motif");
      assert.ok(parsed.payload);
      assert.equal(parsed.payload.id, "motif-1");
      assert.equal(parsed.payload.signature, "a → b");
    });
  });
});
