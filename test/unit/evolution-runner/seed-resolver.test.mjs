import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSeedPopulation } from "../../../src/evolution-runner/seed-resolver.js";

function createCyclingEvaluator(descriptorId, values) {
  let index = 0;
  return (_genome) => {
    const value = values[index % values.length];
    index++;
    return { descriptors: { [descriptorId]: value } };
  };
}

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "ludoforge-seed-resolver-"));
}

async function writeFolderFixtures(dir, count) {
  for (let i = 0; i < count; i++) {
    const def = { idx: i, version: "1.0", players: { count: 2 } };
    await writeFile(join(dir, `game-${i}.json`), JSON.stringify(def), "utf8");
  }
}

const mapElitesConfig = {
  descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
};

function makeGenerateConfig(overrides = {}) {
  return {
    seeding: {
      mode: "generate",
      populationSize: 4,
      generate: {
        coverage: {
          strategy: "random",
          maxAttempts: 200,
          specialOnly: { policy: "cap", maxFraction: 0.10 },
        },
        grammar: {},
      },
      ...overrides,
    },
    mapElites: mapElitesConfig,
    seed: 42,
  };
}

describe("seed-resolver", () => {
  describe("mode: generate", () => {
    it("returns { genomes, report } with correct shape", async () => {
      const config = makeGenerateConfig();
      const evaluator = createCyclingEvaluator("axis", [0.2, 0.8]);

      const result = await resolveSeedPopulation({ config, rngSeed: 42, evaluator });

      assert.ok(Array.isArray(result.genomes));
      assert.equal(result.genomes.length, 4);
      assert.equal(result.report.mode, "generate");
      assert.ok(result.report.generate);
      assert.equal(typeof result.report.generate.attempts, "number");
    });

    it("genomes have id and definition", async () => {
      const config = makeGenerateConfig();
      const evaluator = createCyclingEvaluator("axis", [0.2, 0.8]);

      const result = await resolveSeedPopulation({ config, rngSeed: 42, evaluator });

      for (const genome of result.genomes) {
        assert.equal(typeof genome.id, "string");
        assert.ok(genome.id.length > 0);
        assert.equal(typeof genome.definition, "object");
      }
    });
  });

  describe("mode: folder", () => {
    it("loads genomes from temp dir", async () => {
      const dir = await createTempDir();
      await writeFolderFixtures(dir, 3);

      const config = {
        seeding: {
          mode: "folder",
          populationSize: 10,
          folder: { path: dir },
        },
        mapElites: mapElitesConfig,
        seed: 42,
      };

      const result = await resolveSeedPopulation({
        config,
        rngSeed: 42,
        evaluator: () => ({ descriptors: { axis: 0.5 } }),
      });

      assert.equal(result.genomes.length, 3);
      assert.equal(result.report.mode, "folder");
      assert.ok(result.report.folder);
      assert.equal(result.report.folder.filesFound, 3);
    });
  });

  describe("mode: mixed", () => {
    it("combines folder + generated with correct counts", async () => {
      const dir = await createTempDir();
      await writeFolderFixtures(dir, 10);

      const config = {
        seeding: {
          mode: "mixed",
          populationSize: 10,
          folder: { path: dir },
          generate: {
            coverage: {
              strategy: "random",
              maxAttempts: 500,
              specialOnly: { policy: "cap", maxFraction: 0.10 },
            },
            grammar: {},
          },
          mix: { folderFraction: 0.5 },
        },
        mapElites: mapElitesConfig,
        seed: 42,
      };

      const evaluator = createCyclingEvaluator("axis", [0.2, 0.8]);
      const result = await resolveSeedPopulation({ config, rngSeed: 42, evaluator });

      assert.equal(result.genomes.length, 10);
      assert.equal(result.report.mode, "mixed");
      assert.ok(result.report.folder);
      assert.ok(result.report.generate);
      assert.ok(result.report.mix);
      assert.equal(result.report.mix.folderTarget, 5);
      assert.equal(result.report.mix.folderActual, 5);
      assert.equal(result.report.mix.generateCount, 5);
      assert.equal(result.report.mix.total, 10);
    });

    it("handles folder underfill gracefully", async () => {
      const dir = await createTempDir();
      await writeFolderFixtures(dir, 2);

      const config = {
        seeding: {
          mode: "mixed",
          populationSize: 6,
          folder: { path: dir },
          generate: {
            coverage: {
              strategy: "random",
              maxAttempts: 500,
              specialOnly: { policy: "cap", maxFraction: 0.10 },
            },
            grammar: {},
          },
          mix: { folderFraction: 0.5 },
        },
        mapElites: mapElitesConfig,
        seed: 42,
      };

      const evaluator = createCyclingEvaluator("axis", [0.2, 0.8]);
      const result = await resolveSeedPopulation({ config, rngSeed: 42, evaluator });

      assert.equal(result.genomes.length, 6);
      assert.equal(result.report.mix.folderTarget, 3);
      assert.equal(result.report.mix.folderActual, 2);
      assert.equal(result.report.mix.generateCount, 4);
    });
  });

  describe("unknown mode", () => {
    it("throws on unknown mode", async () => {
      const config = {
        seeding: { mode: "unknown", populationSize: 4 },
        mapElites: mapElitesConfig,
      };

      await assert.rejects(
        () => resolveSeedPopulation({ config, rngSeed: 42, evaluator: () => ({}) }),
        /Unknown seeding mode/,
      );
    });
  });

  describe("determinism", () => {
    it("same rngSeed produces same genome IDs for generate mode", async () => {
      const config = makeGenerateConfig();
      const evalA = createCyclingEvaluator("axis", [0.2, 0.8]);
      const evalB = createCyclingEvaluator("axis", [0.2, 0.8]);

      const resultA = await resolveSeedPopulation({ config, rngSeed: 42, evaluator: evalA });
      const resultB = await resolveSeedPopulation({ config, rngSeed: 42, evaluator: evalB });

      assert.deepStrictEqual(
        resultA.genomes.map((g) => g.id),
        resultB.genomes.map((g) => g.id),
      );
    });
  });
});
