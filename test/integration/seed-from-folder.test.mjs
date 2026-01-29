import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSeedPopulation } from "../../src/evolution-runner/seed-resolver.js";

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "ludoforge-seed-folder-int-"));
}

const mapElitesConfig = {
  descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
};

describe("seed-from-folder integration", () => {
  it("produces deterministic IDs (SHA256 hashes)", async () => {
    const dir = await createTempDir();
    const def = { version: "1.0", players: { count: 2 } };
    await writeFile(join(dir, "game.json"), JSON.stringify(def), "utf8");

    const config = {
      seeding: {
        mode: "folder",
        populationSize: 10,
        folder: { path: dir },
      },
      mapElites: mapElitesConfig,
    };

    const result = await resolveSeedPopulation({
      config,
      rngSeed: 42,
      evaluator: () => ({ descriptors: { axis: 0.5 } }),
    });

    assert.equal(result.genomes.length, 1);
    assert.match(result.genomes[0].id, /^genome-[0-9a-f]{64}$/);
  });

  it("deterministic selection when folder > populationSize", async () => {
    const dir = await createTempDir();
    for (let i = 0; i < 8; i++) {
      await writeFile(
        join(dir, `game-${i}.json`),
        JSON.stringify({ idx: i }),
        "utf8",
      );
    }

    const config = {
      seeding: {
        mode: "folder",
        populationSize: 3,
        folder: { path: dir },
      },
      mapElites: mapElitesConfig,
    };

    const run1 = await resolveSeedPopulation({
      config,
      rngSeed: 77,
      evaluator: () => ({ descriptors: { axis: 0.5 } }),
    });

    const run2 = await resolveSeedPopulation({
      config,
      rngSeed: 77,
      evaluator: () => ({ descriptors: { axis: 0.5 } }),
    });

    assert.deepStrictEqual(
      run1.genomes.map((g) => g.id),
      run2.genomes.map((g) => g.id),
    );
    assert.equal(run1.genomes.length, 3);
  });

  it("onInvalid: error throws on bad JSON", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, "bad.json"), "not valid json{{{", "utf8");

    const config = {
      seeding: {
        mode: "folder",
        populationSize: 10,
        folder: { path: dir, onInvalid: "error" },
      },
      mapElites: mapElitesConfig,
    };

    await assert.rejects(
      () =>
        resolveSeedPopulation({
          config,
          rngSeed: 42,
          evaluator: () => ({ descriptors: { axis: 0.5 } }),
        }),
      /Failed to parse JSON/,
    );
  });

  it("onInvalid: skip skips bad JSON", async () => {
    const dir = await createTempDir();
    const validDef = { version: "1.0" };
    await writeFile(join(dir, "bad.json"), "not valid json{{{", "utf8");
    await writeFile(join(dir, "good.json"), JSON.stringify(validDef), "utf8");

    const config = {
      seeding: {
        mode: "folder",
        populationSize: 10,
        folder: { path: dir, onInvalid: "skip" },
      },
      mapElites: mapElitesConfig,
    };

    const result = await resolveSeedPopulation({
      config,
      rngSeed: 42,
      evaluator: () => ({ descriptors: { axis: 0.5 } }),
    });

    assert.equal(result.genomes.length, 1);
    assert.equal(result.report.folder.filesSkipped, 1);
    assert.equal(result.report.folder.filesLoaded, 1);
  });
});
