import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJsonl } from "../../../src/data-persistence/jsonl.js";
import { readFeedbackJsonl } from "../../../src/data-persistence/feedback-store.js";
import { readPreferenceModelSnapshotJsonl } from "../../../src/data-persistence/preference-model-store.js";
import {
  createRunId,
  resolveRunPath,
} from "../../../src/evolution-runner/run-layout.js";
import { writeGenerationArtifacts } from "../../../src/evolution-runner/artifact-writer.js";

describe("artifact-writer", () => {
  describe("writeGenerationArtifacts", () => {
    it("writes generation artifacts", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-"));
      const runId = createRunId();

      const feedback = [
        {
          id: "feedback-1",
          version: "v1",
          createdAt: new Date().toISOString(),
          feedback: {
            type: "rating",
            rating: 4,
            featureVector: { novelty: 0.2 },
          },
        },
      ];

      const preferenceModelSnapshots = [
        {
          id: "snapshot-1",
          version: "v1",
          createdAt: new Date().toISOString(),
          trainingWindow: { size: 1 },
          hyperparams: { lr: 0.1 },
          metrics: { loss: 0.5 },
          weights: { novelty: 0.2 },
        },
      ];

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 1,
        population: [{ id: "genome-a", definition: { title: "alpha" } }],
        evaluated: [{ genomeId: "genome-a", fitness: 1 }],
        rejected: [{ genomeId: "genome-b", reason: "invalid" }],
        mapElites: { elites: [{ id: "genome-a" }] },
        shortlist: ["genome-a"],
        feedback,
        preferenceModelSnapshots,
        determinism: { seed: 123, rng: { module: "runner" } },
      });

      const populationContents = await readFile(result.populationPath, "utf8");
      const populationEntries = parseJsonl(populationContents);
      assert.deepEqual(populationEntries, [{ id: "genome-a", definition: { title: "alpha" } }]);

      const evaluatedContents = await readFile(result.evaluatedPath, "utf8");
      assert.deepEqual(parseJsonl(evaluatedContents), [{ genomeId: "genome-a", fitness: 1 }]);

      const rejectedContents = await readFile(result.rejectedPath, "utf8");
      assert.deepEqual(parseJsonl(rejectedContents), [{ genomeId: "genome-b", reason: "invalid" }]);

      const mapElitesContents = await readFile(result.mapElitesPath, "utf8");
      assert.deepEqual(JSON.parse(mapElitesContents), { elites: [{ id: "genome-a" }] });

      const shortlistContents = await readFile(result.shortlistPath, "utf8");
      assert.deepEqual(JSON.parse(shortlistContents), ["genome-a"]);

      const feedbackRecords = await readFeedbackJsonl(result.feedbackPath);
      assert.equal(feedbackRecords.length, 1);
      assert.equal(feedbackRecords[0].id, "feedback-1");

      const preferenceSnapshots = await readPreferenceModelSnapshotJsonl(result.preferenceModelPath);
      assert.equal(preferenceSnapshots.length, 1);
      assert.equal(preferenceSnapshots[0].id, "snapshot-1");

      const determinismContents = await readFile(result.determinismPath, "utf8");
      const determinism = JSON.parse(determinismContents);
      assert.equal(determinism.seed, 123);
      assert.equal(determinism.generation, 1);

      const generationPath = resolveRunPath(
        join(baseDir, "runs", runId),
        "generation-1",
      );
      assert.equal(result.generationDir, generationPath);
    });

    it("rejects invalid population entries", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-"));
      const runId = createRunId();

      await assert.rejects(
        () =>
          writeGenerationArtifacts({
            baseDir,
            runId,
            generation: 0,
            population: [{ id: "", definition: { title: "alpha" } }],
            preferenceModelSnapshots: [
              {
                id: "snapshot-1",
                version: "v1",
                createdAt: new Date().toISOString(),
                trainingWindow: { size: 1 },
                hyperparams: { lr: 0.1 },
                metrics: { loss: 0.5 },
                weights: { novelty: 0.2 },
              },
            ],
          }),
        /population entry 0 id/i,
      );
    });
  });
});
