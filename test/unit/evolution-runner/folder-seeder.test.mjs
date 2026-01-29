import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { serializeGameDefinition } from "../../../src/dsl/serialize.js";
import { loadFolderSeeds } from "../../../src/evolution-runner/folder-seeder.js";

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "ludoforge-folder-seeds-"));
}

function expectedId(definition) {
  const canonical = serializeGameDefinition(definition);
  return `genome-${createHash("sha256").update(canonical).digest("hex")}`;
}

describe("folder-seeder", () => {
  describe("loadFolderSeeds", () => {
    it("loads all JSON files and wraps as genomes", async () => {
      const dir = await createTempDir();
      const defA = { version: "1.0", players: { count: 2 } };
      const defB = { version: "1.0", players: { count: 3 } };

      await writeFile(join(dir, "a.json"), JSON.stringify(defA), "utf8");
      await writeFile(join(dir, "b.json"), JSON.stringify(defB), "utf8");

      const { genomes } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes.length, 2);
      assert.deepEqual(genomes[0].definition, defA);
      assert.deepEqual(genomes[1].definition, defB);
      assert.ok(genomes[0].id.startsWith("genome-"));
      assert.ok(genomes[1].id.startsWith("genome-"));
    });

    it("report has correct counts", async () => {
      const dir = await createTempDir();
      const def = { version: "1.0" };

      await writeFile(join(dir, "x.json"), JSON.stringify(def), "utf8");
      await writeFile(join(dir, "y.json"), JSON.stringify(def), "utf8");

      const { report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(report.filesFound, 2);
      assert.equal(report.filesLoaded, 2);
      assert.equal(report.filesSkipped, 0);
      assert.equal(report.genomesReturned, 2);
    });

    it("IDs match genome-<sha256> of canonical JSON", async () => {
      const dir = await createTempDir();
      const def = { version: "1.0", players: { count: 2 } };

      await writeFile(join(dir, "game.json"), JSON.stringify(def), "utf8");

      const { genomes } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes[0].id, expectedId(def));
      assert.match(genomes[0].id, /^genome-[0-9a-f]{64}$/);
    });

    it("same definition content produces same ID regardless of key order", async () => {
      const dir = await createTempDir();
      const defOrdered = { a: 1, b: 2 };
      const defReversed = { b: 2, a: 1 };

      await writeFile(join(dir, "ordered.json"), JSON.stringify(defOrdered), "utf8");
      await writeFile(join(dir, "reversed.json"), JSON.stringify(defReversed), "utf8");

      const { genomes } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes[0].id, genomes[1].id);
    });

    it("down-selects when files exceed populationSize", async () => {
      const dir = await createTempDir();

      for (let i = 0; i < 5; i++) {
        const def = { idx: i };
        await writeFile(join(dir, `game-${i}.json`), JSON.stringify(def), "utf8");
      }

      const { genomes, report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 3,
        rngSeed: 99,
      });

      assert.equal(genomes.length, 3);
      assert.equal(report.filesFound, 5);
      assert.equal(report.filesLoaded, 5);
      assert.equal(report.genomesReturned, 3);
    });

    it("same rngSeed produces same selection", async () => {
      const dir = await createTempDir();

      for (let i = 0; i < 5; i++) {
        const def = { idx: i };
        await writeFile(join(dir, `game-${i}.json`), JSON.stringify(def), "utf8");
      }

      const run1 = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 3,
        rngSeed: 77,
      });

      const run2 = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 3,
        rngSeed: 77,
      });

      assert.deepEqual(
        run1.genomes.map((g) => g.id),
        run2.genomes.map((g) => g.id),
      );
    });

    it("returns all genomes when fewer files than populationSize", async () => {
      const dir = await createTempDir();
      const def = { version: "1.0" };

      await writeFile(join(dir, "only.json"), JSON.stringify(def), "utf8");

      const { genomes, report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes.length, 1);
      assert.equal(report.genomesReturned, 1);
    });

    it("throws on bad JSON when onInvalid is error", async () => {
      const dir = await createTempDir();

      await writeFile(join(dir, "bad.json"), "not valid json{{{", "utf8");

      await assert.rejects(
        () =>
          loadFolderSeeds({
            folderPath: dir,
            populationSize: 10,
            rngSeed: 42,
            onInvalid: "error",
          }),
        (error) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("Failed to parse JSON"));
          return true;
        },
      );
    });

    it("skips bad JSON when onInvalid is skip", async () => {
      const dir = await createTempDir();
      const def = { version: "1.0" };

      await writeFile(join(dir, "bad.json"), "not valid json{{{", "utf8");
      await writeFile(join(dir, "good.json"), JSON.stringify(def), "utf8");

      const { genomes, report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
        onInvalid: "skip",
      });

      assert.equal(genomes.length, 1);
      assert.equal(report.filesFound, 2);
      assert.equal(report.filesLoaded, 1);
      assert.equal(report.filesSkipped, 1);
    });

    it("ignores non-JSON files", async () => {
      const dir = await createTempDir();
      const def = { version: "1.0" };

      await writeFile(join(dir, "game.json"), JSON.stringify(def), "utf8");
      await writeFile(join(dir, "readme.txt"), "not a game", "utf8");
      await writeFile(join(dir, "notes.md"), "# notes", "utf8");

      const { genomes, report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes.length, 1);
      assert.equal(report.filesFound, 1);
    });

    it("returns empty result for empty folder", async () => {
      const dir = await createTempDir();

      const { genomes, report } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes.length, 0);
      assert.equal(report.filesFound, 0);
      assert.equal(report.filesLoaded, 0);
      assert.equal(report.filesSkipped, 0);
      assert.equal(report.genomesReturned, 0);
    });

    it("preserves lexicographic sort order", async () => {
      const dir = await createTempDir();

      await writeFile(join(dir, "c.json"), JSON.stringify({ name: "c" }), "utf8");
      await writeFile(join(dir, "a.json"), JSON.stringify({ name: "a" }), "utf8");
      await writeFile(join(dir, "b.json"), JSON.stringify({ name: "b" }), "utf8");

      const { genomes } = await loadFolderSeeds({
        folderPath: dir,
        populationSize: 10,
        rngSeed: 42,
      });

      assert.equal(genomes[0].definition.name, "a");
      assert.equal(genomes[1].definition.name, "b");
      assert.equal(genomes[2].definition.name, "c");
    });
  });
});
