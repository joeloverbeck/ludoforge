import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertValidRunId,
  createRunId,
  isValidRunId,
  listRuns,
  resolveRunDir,
  resolveRunPath,
  resolveRunsRoot,
  writeRunMetadata,
} from "../../../src/evolution-runner/run-layout.js";

describe("run-layout", () => {
  describe("createRunId", () => {
    it("generates a valid run ID", () => {
      const runId = createRunId();
      assert.equal(isValidRunId(runId), true);
    });
  });

  describe("assertValidRunId", () => {
    it("rejects invalid IDs", () => {
      assert.throws(() => assertValidRunId("not-a-uuid"), /invalid run id/i);
    });
  });

  describe("resolveRunDir", () => {
    it("rejects invalid run IDs", () => {
      assert.throws(() => resolveRunDir("/tmp", "bad"), /invalid run id/i);
    });
  });

  describe("resolveRunPath", () => {
    it("blocks traversal outside run directory", () => {
      const runDir = join(tmpdir(), "ludoforge-run");
      assert.throws(
        () => resolveRunPath(runDir, "..", "escape.json"),
        /escapes run directory/i,
      );
    });
  });

  describe("writeRunMetadata", () => {
    it("writes run.json inside the run directory", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-"));
      const runId = createRunId();

      const filePath = await writeRunMetadata(baseDir, runId, { seed: 42 });
      const contents = await readFile(filePath, "utf8");
      const parsed = JSON.parse(contents);

      assert.equal(parsed.runId, runId);
      assert.equal(parsed.seed, 42);
      assert.equal(typeof parsed.createdAt, "string");
      assert.match(filePath, new RegExp(`runs/${runId}/run\\.json$`));
    });
  });

  describe("listRuns", () => {
    it("returns valid run IDs sorted", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-runs-"));
      const runIdA = createRunId();
      const runIdB = createRunId();
      const runsRoot = resolveRunsRoot(baseDir);

      await mkdir(runsRoot, { recursive: true });
      await mkdir(join(runsRoot, runIdB));
      await mkdir(join(runsRoot, runIdA));
      await mkdir(join(runsRoot, "not-a-run"));

      const runs = await listRuns(baseDir);
      const expected = [runIdA, runIdB].sort((left, right) => left.localeCompare(right));

      assert.deepEqual(runs, expected);
    });
  });
});
