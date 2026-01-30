import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readdir, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { pruneOldGenerations } from "../../../src/evolution-runner/generation-cleanup.js";

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

async function createRunDir(baseDir) {
  const runDir = join(baseDir, "runs", RUN_ID);
  await mkdir(runDir, { recursive: true });
  return runDir;
}

async function createGenerationDir(runDir, generation) {
  const dir = join(runDir, `generation-${generation}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "population.jsonl"), "");
  return dir;
}

async function listGenerationDirs(runDir) {
  const entries = await readdir(runDir);
  return entries
    .filter((name) => /^generation-\d+$/.test(name))
    .sort();
}

describe("pruneOldGenerations", () => {
  it("returns empty removed list when maxRetained is null", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    await createGenerationDir(runDir, 0);

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: null,
    });

    assert.deepStrictEqual(result, { removed: [] });
    const dirs = await listGenerationDirs(runDir);
    assert.equal(dirs.length, 1);
  });

  it("returns empty removed list when maxRetained is undefined", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    await createGenerationDir(runDir, 0);

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: undefined,
    });

    assert.deepStrictEqual(result, { removed: [] });
  });

  it("returns empty removed list when maxRetained is less than 1", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    await createGenerationDir(runDir, 0);

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 0,
    });

    assert.deepStrictEqual(result, { removed: [] });
    const dirs = await listGenerationDirs(runDir);
    assert.equal(dirs.length, 1);
  });

  it("removes oldest dirs when count exceeds maxRetained", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    for (let i = 0; i < 5; i++) {
      await createGenerationDir(runDir, i);
    }

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 3,
    });

    assert.equal(result.removed.length, 2);
    assert.deepStrictEqual(result.removed[0], { name: "generation-0", generation: 0 });
    assert.deepStrictEqual(result.removed[1], { name: "generation-1", generation: 1 });

    const dirs = await listGenerationDirs(runDir);
    assert.deepStrictEqual(dirs, ["generation-2", "generation-3", "generation-4"]);
  });

  it("does not remove when count equals maxRetained", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    for (let i = 0; i < 3; i++) {
      await createGenerationDir(runDir, i);
    }

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 3,
    });

    assert.deepStrictEqual(result, { removed: [] });
    const dirs = await listGenerationDirs(runDir);
    assert.equal(dirs.length, 3);
  });

  it("does not remove when count is below maxRetained", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    await createGenerationDir(runDir, 0);

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 5,
    });

    assert.deepStrictEqual(result, { removed: [] });
  });

  it("ignores non-generation entries in the run directory", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    for (let i = 0; i < 4; i++) {
      await createGenerationDir(runDir, i);
    }
    await writeFile(join(runDir, "run.json"), "{}");
    await writeFile(join(runDir, "seed-report.json"), "{}");
    await mkdir(join(runDir, "some-other-dir"), { recursive: true });

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 2,
    });

    assert.equal(result.removed.length, 2);
    const dirs = await listGenerationDirs(runDir);
    assert.deepStrictEqual(dirs, ["generation-2", "generation-3"]);

    const allEntries = await readdir(runDir);
    assert.ok(allEntries.includes("run.json"));
    assert.ok(allEntries.includes("seed-report.json"));
    assert.ok(allEntries.includes("some-other-dir"));
  });

  it("handles non-contiguous generation numbers", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    for (const gen of [0, 3, 7, 10, 15]) {
      await createGenerationDir(runDir, gen);
    }

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 2,
    });

    assert.equal(result.removed.length, 3);
    assert.deepStrictEqual(result.removed[0], { name: "generation-0", generation: 0 });
    assert.deepStrictEqual(result.removed[1], { name: "generation-3", generation: 3 });
    assert.deepStrictEqual(result.removed[2], { name: "generation-7", generation: 7 });

    const dirs = await listGenerationDirs(runDir);
    assert.deepStrictEqual(dirs, ["generation-10", "generation-15"]);
  });

  it("returns correct removed list with names and generation numbers", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-cleanup-"));
    const runDir = await createRunDir(baseDir);
    for (let i = 0; i < 3; i++) {
      await createGenerationDir(runDir, i);
    }

    const result = await pruneOldGenerations({
      baseDir,
      runId: RUN_ID,
      maxRetained: 1,
    });

    assert.equal(result.removed.length, 2);
    for (const entry of result.removed) {
      assert.equal(typeof entry.name, "string");
      assert.ok(entry.name.startsWith("generation-"));
      assert.equal(typeof entry.generation, "number");
    }
  });
});
