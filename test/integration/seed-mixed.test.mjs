import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSeedPopulation } from "../../src/evolution-runner/seed-resolver.js";

function createCyclingEvaluator(descriptorId, values) {
  let index = 0;
  return (_genome) => {
    const value = values[index % values.length];
    index++;
    return { descriptors: { [descriptorId]: value } };
  };
}

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "ludoforge-seed-mixed-int-"));
}

const mapElitesConfig = {
  descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
};

describe("seed-mixed integration", () => {
  it("folderFraction 0.5, populationSize 10 → 5 from folder + 5 generated", async () => {
    const dir = await createTempDir();
    for (let i = 0; i < 10; i++) {
      await writeFile(
        join(dir, `game-${i}.json`),
        JSON.stringify({ idx: i, version: "1.0" }),
        "utf8",
      );
    }

    const config = {
      seeding: {
        mode: "mixed",
        populationSize: 10,
        folder: { path: dir },
        generate: {
          coverage: {
            strategy: "random",
            maxAttempts: 500,
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
    assert.equal(result.report.mix.folderActual, 5);
    assert.equal(result.report.mix.generateCount, 5);
    assert.equal(result.report.mix.total, 10);
  });

  it("report has both folder and generate sub-reports", async () => {
    const dir = await createTempDir();
    for (let i = 0; i < 6; i++) {
      await writeFile(
        join(dir, `game-${i}.json`),
        JSON.stringify({ idx: i }),
        "utf8",
      );
    }

    const config = {
      seeding: {
        mode: "mixed",
        populationSize: 8,
        folder: { path: dir },
        generate: {
          coverage: {
            strategy: "random",
            maxAttempts: 500,
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

    assert.ok(result.report.folder, "report has folder sub-report");
    assert.ok(result.report.generate, "report has generate sub-report");
    assert.equal(typeof result.report.folder.filesFound, "number");
    assert.equal(typeof result.report.generate.attempts, "number");
  });

  it("total genomes equals populationSize", async () => {
    const dir = await createTempDir();
    for (let i = 0; i < 20; i++) {
      await writeFile(
        join(dir, `game-${i}.json`),
        JSON.stringify({ idx: i }),
        "utf8",
      );
    }

    const config = {
      seeding: {
        mode: "mixed",
        populationSize: 12,
        folder: { path: dir },
        generate: {
          coverage: {
            strategy: "random",
            maxAttempts: 500,
          },
          grammar: {},
        },
        mix: { folderFraction: 0.5 },
      },
      mapElites: mapElitesConfig,
      seed: 42,
    };

    const evaluator = createCyclingEvaluator("axis", [0.3, 0.7]);
    const result = await resolveSeedPopulation({ config, rngSeed: 42, evaluator });

    assert.equal(result.genomes.length, 12);
    assert.equal(result.report.mix.total, 12);
  });
});
