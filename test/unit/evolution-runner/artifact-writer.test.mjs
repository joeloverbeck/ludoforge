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

    it("writes preference-controller.json when preferenceController provided", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-pref-ctrl-"));
      const runId = createRunId();

      const preferenceController = {
        mode: "learning",
        stableGenCount: 0,
        lastCalibrationGen: null,
        lastMetricIdSetHash: "abc123",
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 2,
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
        preferenceController,
      });

      assert.ok(result.preferenceControllerPath);
      const contents = await readFile(result.preferenceControllerPath, "utf8");
      const parsed = JSON.parse(contents);
      assert.equal(parsed.mode, "learning");
      assert.equal(parsed.stableGenCount, 0);
      assert.equal(parsed.lastCalibrationGen, null);
      assert.equal(parsed.lastMetricIdSetHash, "abc123");
    });

    it("omits preference-controller.json when preferenceController is undefined", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-no-ctrl-"));
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

      assert.equal(result.preferenceControllerPath, undefined);
    });

    it("writes preference-health.json when preferenceHealth provided", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-pref-health-"));
      const runId = createRunId();

      const preferenceHealth = {
        meanUncertainty: 0.15,
        oodRate: 0.02,
        controllerMode: "frozen",
        stableGenCount: 5,
        plannedBudget: 0,
        didPrompt: false,
        metricIdDeltaDetected: false,
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 5,
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
        preferenceHealth,
      });

      assert.ok(result.preferenceHealthPath);
      const contents = await readFile(result.preferenceHealthPath, "utf8");
      const parsed = JSON.parse(contents);
      assert.equal(parsed.meanUncertainty, 0.15);
      assert.equal(parsed.oodRate, 0.02);
      assert.equal(parsed.controllerMode, "frozen");
      assert.equal(parsed.didPrompt, false);
      assert.equal(parsed.metricIdDeltaDetected, false);
    });

    it("omits preference-health.json when preferenceHealth is undefined", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-no-health-"));
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

      assert.equal(result.preferenceHealthPath, undefined);
    });

    it("writes taste-vector.json when tasteVector provided", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-taste-"));
      const runId = createRunId();

      const tasteVector = {
        version: 1,
        sampleCount: 42,
        controllerMode: "learning",
        weights: { novelty: 0.8, balance: -0.3 },
        stddev: { novelty: 0.05, balance: 0.12 },
        topPositive: ["novelty"],
        topNegative: ["balance"],
      };

      const result = await writeGenerationArtifacts({
        baseDir,
        runId,
        generation: 3,
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
        tasteVector,
      });

      assert.ok(result.tasteVectorPath);
      const contents = await readFile(result.tasteVectorPath, "utf8");
      const parsed = JSON.parse(contents);
      assert.equal(parsed.version, 1);
      assert.equal(parsed.sampleCount, 42);
      assert.equal(parsed.controllerMode, "learning");
      assert.deepEqual(parsed.weights, { novelty: 0.8, balance: -0.3 });
      assert.deepEqual(parsed.topPositive, ["novelty"]);
      assert.deepEqual(parsed.topNegative, ["balance"]);
    });

    it("omits taste-vector.json when tasteVector is undefined", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-no-taste-"));
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

      assert.equal(result.tasteVectorPath, undefined);
    });

    it("rejects non-object preferenceController", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-artifacts-bad-ctrl-"));
      const runId = createRunId();

      await assert.rejects(
        () =>
          writeGenerationArtifacts({
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
            preferenceController: "invalid",
          }),
        /preference controller must be an object/i,
      );
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
