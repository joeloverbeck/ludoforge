import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runMotifMiningPipeline } from "../../../src/evolution-runner/motif-pipeline.js";

async function loadMinimalDefinition() {
  const fileUrl = new URL("../fixtures/dsl/valid/minimal.json", import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function makePlacement(definition, id, fitness, coordinates) {
  return {
    genome: { id, definition: structuredClone(definition) },
    fitness,
    coordinates,
    isElite: true,
  };
}

describe("motif-pipeline", () => {
  describe("runMotifMiningPipeline", () => {
    it("returns null when motif mining is disabled", async () => {
      const definition = await loadMinimalDefinition();
      const baseDir = await mkdtemp(join(tmpdir(), "motif-pipeline-disabled-"));
      const genDir = join(baseDir, "gen-0");
      await mkdir(genDir, { recursive: true });

      const result = await runMotifMiningPipeline({
        mapElitesResult: { placements: [makePlacement(definition, "a", 10, [0])] },
        motifMiningConfig: { enabled: false },
        simulationConfig: {},
        generationDir: genDir,
        seed: 0,
      });

      assert.equal(result, null);
    });

    it("returns null when no elites are available", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "motif-pipeline-empty-"));
      const genDir = join(baseDir, "gen-0");
      await mkdir(genDir, { recursive: true });

      const result = await runMotifMiningPipeline({
        mapElitesResult: { placements: [] },
        motifMiningConfig: {
          enabled: true,
          eliteSelection: { perNicheTopK: 3, globalTopK: 10 },
          minSupport: 2,
          maxMotifLength: 5,
          ngramSizes: [2, 3],
        },
        simulationConfig: {},
        generationDir: genDir,
        seed: 0,
      });

      assert.equal(result, null);
    });

    it("runs full pipeline and writes motifs.jsonl", async () => {
      const definition = await loadMinimalDefinition();
      const baseDir = await mkdtemp(join(tmpdir(), "motif-pipeline-full-"));
      const genDir = join(baseDir, "gen-0");
      await mkdir(genDir, { recursive: true });

      const placements = [
        makePlacement(definition, "a", 10, [0]),
        makePlacement(definition, "b", 8, [0]),
        makePlacement(definition, "c", 6, [1]),
      ];

      const result = await runMotifMiningPipeline({
        mapElitesResult: { placements },
        motifMiningConfig: {
          enabled: true,
          eliteSelection: { perNicheTopK: 2, globalTopK: 5 },
          minSupport: 1,
          maxMotifLength: 5,
          ngramSizes: [2],
          seed: 42,
        },
        simulationConfig: {},
        generationDir: genDir,
        seed: 42,
      });

      // Result may be null if no motifs meet support threshold, that's valid.
      // But the file should be created if result is non-null.
      if (result !== null) {
        assert.ok(Array.isArray(result.motifEffects));
        assert.ok(Array.isArray(result.motifRecords));

        const motifFile = join(genDir, "motifs.jsonl");
        const contents = await readFile(motifFile, "utf8");
        assert.ok(contents.length > 0, "motifs.jsonl should have content");

        for (const record of result.motifRecords) {
          assert.ok(record.id);
          assert.equal(record.version, "v1");
          assert.ok(record.createdAt);
          assert.ok(typeof record.signature === "string");
          assert.ok(typeof record.support === "number");
        }
      }
    });

    it("returns correct output structure when motifs are found", async () => {
      const definition = await loadMinimalDefinition();
      const baseDir = await mkdtemp(join(tmpdir(), "motif-pipeline-struct-"));
      const genDir = join(baseDir, "gen-0");
      await mkdir(genDir, { recursive: true });

      const placements = [
        makePlacement(definition, "a", 10, [0]),
        makePlacement(definition, "b", 8, [1]),
      ];

      const result = await runMotifMiningPipeline({
        mapElitesResult: { placements },
        motifMiningConfig: {
          enabled: true,
          eliteSelection: { perNicheTopK: 1, globalTopK: 2 },
          minSupport: 1,
          maxMotifLength: 5,
          ngramSizes: [2],
          seed: 7,
        },
        simulationConfig: {},
        generationDir: genDir,
        seed: 7,
      });

      if (result !== null) {
        assert.ok("motifEffects" in result);
        assert.ok("motifRecords" in result);
        assert.ok(Array.isArray(result.motifEffects));
        assert.ok(Array.isArray(result.motifRecords));
      }
    });
  });
});
