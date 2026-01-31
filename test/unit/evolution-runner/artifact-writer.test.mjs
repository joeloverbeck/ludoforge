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
          models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
          ensemble: { size: 1, method: "online-bagging" },
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
        operatorStats: { operators: { alpha: { attempts: 1 } } },
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

      const operatorStatsContents = await readFile(result.operatorStatsPath, "utf8");
      assert.deepEqual(JSON.parse(operatorStatsContents), {
        operators: { alpha: { attempts: 1 } },
      });

      const generationPath = resolveRunPath(
        join(baseDir, "runs", runId),
        "generation-1",
      );
      assert.equal(result.generationDir, generationPath);
    });

    it("writes health.json with correct structure", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-health-"));
      const runId = createRunId();

      const health = {
        meanFitness: 2.5,
        medianFitness: 2.0,
        rejectionRate: 0.25,
        rejectionReasons: { "repair-failure": 1 },
        degeneracyFlags: { "forced-move": 2, stalemate: 1 },
        nicheOccupancy: 3,
        operatorInefficiencyRate: 0.4,
        repairFailureRate: 0.1,
        noOpRate: 0.05,
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 0,
        population: [{ id: "genome-a", definition: { title: "alpha" } }],
        preferenceModelSnapshots: [
          {
            id: "snapshot-1",
            version: "v1",
            createdAt: new Date().toISOString(),
            trainingWindow: { size: 1 },
            hyperparams: { lr: 0.1 },
            metrics: { loss: 0.5 },
            models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
            ensemble: { size: 1, method: "online-bagging" },
          },
        ],
        health,
      });

      assert.ok(result.healthPath);
      const healthContents = await readFile(result.healthPath, "utf8");
      const parsed = JSON.parse(healthContents);
      assert.equal(parsed.meanFitness, 2.5);
      assert.equal(parsed.medianFitness, 2.0);
      assert.equal(parsed.rejectionRate, 0.25);
      assert.deepEqual(parsed.rejectionReasons, { "repair-failure": 1 });
      assert.deepEqual(parsed.degeneracyFlags, { "forced-move": 2, stalemate: 1 });
      assert.equal(parsed.nicheOccupancy, 3);
      assert.equal(parsed.operatorInefficiencyRate, 0.4);
      assert.equal(parsed.repairFailureRate, 0.1);
      assert.equal(parsed.noOpRate, 0.05);
    });

    it("all health.json numeric fields are finite numbers", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-health-finite-"));
      const runId = createRunId();

      const health = {
        meanFitness: 0,
        medianFitness: 0,
        rejectionRate: 0,
        rejectionReasons: {},
        degeneracyFlags: {},
        nicheOccupancy: 0,
        operatorInefficiencyRate: 0,
        repairFailureRate: 0,
        noOpRate: 0,
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 0,
        population: [{ id: "genome-a", definition: { title: "alpha" } }],
        preferenceModelSnapshots: [
          {
            id: "snapshot-1",
            version: "v1",
            createdAt: new Date().toISOString(),
            trainingWindow: { size: 1 },
            hyperparams: { lr: 0.1 },
            metrics: { loss: 0.5 },
            models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
            ensemble: { size: 1, method: "online-bagging" },
          },
        ],
        health,
      });

      const healthContents = await readFile(result.healthPath, "utf8");
      const parsed = JSON.parse(healthContents);
      for (const key of ["meanFitness", "medianFitness", "rejectionRate", "nicheOccupancy", "operatorInefficiencyRate", "repairFailureRate", "noOpRate"]) {
        assert.ok(Number.isFinite(parsed[key]), `${key} should be finite, got ${parsed[key]}`);
      }
    });

    it("writes preference-metrics.json when preferenceMetrics provided", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-pref-metrics-"));
      const runId = createRunId();

      const preferenceMetrics = {
        accuracy: 0.75,
        correct: 3,
        total: 4,
        ties: 0,
        bucketSize: 0.1,
        calibrationBuckets: [],
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 0,
        population: [{ id: "genome-a", definition: { title: "alpha" } }],
        preferenceModelSnapshots: [
          {
            id: "snapshot-1",
            version: "v1",
            createdAt: new Date().toISOString(),
            trainingWindow: { size: 1 },
            hyperparams: { lr: 0.1 },
            metrics: { loss: 0.5 },
            models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
            ensemble: { size: 1, method: "online-bagging" },
          },
        ],
        preferenceMetrics,
      });

      assert.ok(result.preferenceMetricsPath);
      const contents = await readFile(result.preferenceMetricsPath, "utf8");
      const parsed = JSON.parse(contents);
      assert.equal(parsed.accuracy, 0.75);
      assert.equal(parsed.correct, 3);
      assert.equal(parsed.total, 4);
    });

    it("omits preference-metrics.json when preferenceMetrics is undefined", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-no-pref-"));
      const runId = createRunId();

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 0,
        population: [{ id: "genome-a", definition: { title: "alpha" } }],
        preferenceModelSnapshots: [
          {
            id: "snapshot-1",
            version: "v1",
            createdAt: new Date().toISOString(),
            trainingWindow: { size: 1 },
            hyperparams: { lr: 0.1 },
            metrics: { loss: 0.5 },
            models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
            ensemble: { size: 1, method: "online-bagging" },
          },
        ],
      });

      assert.equal(result.preferenceMetricsPath, undefined);
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
                models: [{ weights: { novelty: 0.2 }, bias: 0, sampleCount: 1 }],
                ensemble: { size: 1, method: "online-bagging" },
              },
            ],
          }),
        /population entry 0 id/i,
      );
    });
  });
});
