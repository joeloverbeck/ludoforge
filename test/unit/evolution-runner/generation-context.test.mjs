import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { buildGenerationContext } from "../../../src/evolution-runner/generation-context.js";

function makeLoopResult() {
  return {
    evaluated: [
      { fitness: 1, diagnostics: {} },
      { fitness: 3, diagnostics: {} },
    ],
    rejected: [{ reason: "degeneracy" }],
    mapElites: { elites: new Map() },
    shortlist: [],
  };
}

const baseTelemetry = { operators: {} };

describe("generation-context", () => {
  describe("buildGenerationContext", () => {
    it("returns undefined feedback when feedbackEnabled is false", async () => {
      const result = await buildGenerationContext({
        generation: 0,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: false,
        feedbackProvider: mock.fn(),
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(result.feedback, undefined);
    });

    it("calls feedbackProvider when feedbackEnabled is true", async () => {
      const feedbackProvider = mock.fn(() => [{ type: "feedback" }]);
      const result = await buildGenerationContext({
        generation: 1,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: true,
        feedbackProvider,
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(feedbackProvider.mock.callCount(), 1);
      assert.deepStrictEqual(result.feedback, [{ type: "feedback" }]);
    });

    it("uses default snapshot when no snapshotProvider", async () => {
      const result = await buildGenerationContext({
        generation: 2,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: false,
        feedbackProvider: null,
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(result.preferenceModelSnapshots.length, 1);
      assert.equal(result.preferenceModelSnapshots[0].id, "test-run-pref-2");
      assert.equal(result.preferenceModelSnapshots[0].seed, 42);
    });

    it("calls snapshotProvider when provided", async () => {
      const snapshotProvider = mock.fn(() => [
        { id: "custom-snap", version: "v1", createdAt: new Date().toISOString() },
      ]);
      const result = await buildGenerationContext({
        generation: 3,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: false,
        feedbackProvider: null,
        snapshotProvider,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(snapshotProvider.mock.callCount(), 1);
      assert.equal(result.preferenceModelSnapshots[0].id, "custom-snap");
    });

    it("throws on empty snapshots", async () => {
      await assert.rejects(
        () =>
          buildGenerationContext({
            generation: 0,
            runId: "test-run",
            baseDir: "/tmp",
            loopResult: makeLoopResult(),
            population: [{ id: "a", definition: {} }],
            feedbackEnabled: false,
            feedbackProvider: null,
            snapshotProvider: () => [],
            seed: 42,
            telemetry: baseTelemetry,
          }),
        /Preference model snapshots/,
      );
    });

    it("returns preferenceMetrics when feedback contains comparisons", async () => {
      const snapshotProvider = () => [
        {
          id: "snap-1",
          version: "v1",
          createdAt: new Date().toISOString(),
          trainingWindow: { size: 1 },
          hyperparams: { lr: 0.1 },
          metrics: { loss: 0.5 },
          models: [{ weights: { novelty: 0.5 }, bias: 0.1, sampleCount: 2 }],
          ensemble: { size: 1, method: "online-bagging" },
        },
      ];
      const feedbackProvider = mock.fn(() => [
        {
          type: "comparison",
          preferred: "a",
          featureA: { novelty: 0.8 },
          featureB: { novelty: 0.2 },
        },
        {
          type: "comparison",
          preferred: "b",
          featureA: { novelty: 0.1 },
          featureB: { novelty: 0.9 },
        },
      ]);
      const result = await buildGenerationContext({
        generation: 0,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: true,
        feedbackProvider,
        snapshotProvider,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.ok(result.preferenceMetrics !== undefined);
      assert.equal(typeof result.preferenceMetrics.accuracy, "number");
      assert.equal(result.preferenceMetrics.total, 2);
    });

    it("returns undefined preferenceMetrics when no comparisons in feedback", async () => {
      const feedbackProvider = mock.fn(() => [
        { type: "rating", rating: 4 },
      ]);
      const result = await buildGenerationContext({
        generation: 0,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: true,
        feedbackProvider,
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(result.preferenceMetrics, undefined);
    });

    it("returns undefined preferenceMetrics when feedback is undefined", async () => {
      const result = await buildGenerationContext({
        generation: 0,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: false,
        feedbackProvider: null,
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.equal(result.preferenceMetrics, undefined);
    });

    it("includes health metrics in result", async () => {
      const result = await buildGenerationContext({
        generation: 0,
        runId: "test-run",
        baseDir: "/tmp",
        loopResult: makeLoopResult(),
        population: [{ id: "a", definition: {} }],
        feedbackEnabled: false,
        feedbackProvider: null,
        snapshotProvider: null,
        seed: 42,
        telemetry: baseTelemetry,
      });
      assert.ok(typeof result.health === "object");
      assert.ok("meanFitness" in result.health);
      assert.ok("rejectionRate" in result.health);
      assert.ok("nicheOccupancy" in result.health);
    });
  });
});
