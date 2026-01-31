import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  findDominantRejectionReason,
  checkHighRejectionHalt,
  checkPopulationExtinction,
} from "../../../src/evolution-runner/termination-checks.js";
import { defaultPreferenceModelSnapshot } from "../../../src/evolution-runner/serialization-utils.js";

describe("termination-checks", () => {
  describe("findDominantRejectionReason", () => {
    it("returns 'unknown' for empty array", () => {
      assert.equal(findDominantRejectionReason([]), "unknown");
    });

    it("returns the single reason when only one entry", () => {
      assert.equal(
        findDominantRejectionReason([{ reason: "degeneracy" }]),
        "degeneracy",
      );
    });

    it("returns the majority reason", () => {
      const rejected = [
        { reason: "degeneracy" },
        { reason: "invalid" },
        { reason: "degeneracy" },
        { reason: "degeneracy" },
        { reason: "invalid" },
      ];
      assert.equal(findDominantRejectionReason(rejected), "degeneracy");
    });

    it("falls back to 'unknown' for entries without reason", () => {
      const rejected = [{}, {}, { reason: "invalid" }];
      assert.equal(findDominantRejectionReason(rejected), "unknown");
    });
  });

  describe("checkHighRejectionHalt", () => {
    it("resets counter when rejection rate is below threshold", () => {
      const result = checkHighRejectionHalt({
        rejectionRate: 0.5,
        rejectionRateThreshold: 0.8,
        consecutiveHighRejections: 2,
        maxConsecutiveRejections: 3,
        generation: 5,
        rejected: [],
        logger: null,
      });
      assert.equal(result.consecutiveHighRejections, 0);
      assert.equal(result.haltedReason, null);
    });

    it("increments counter when rejection rate exceeds threshold", () => {
      const result = checkHighRejectionHalt({
        rejectionRate: 0.9,
        rejectionRateThreshold: 0.8,
        consecutiveHighRejections: 1,
        maxConsecutiveRejections: 3,
        generation: 5,
        rejected: [{ reason: "degeneracy" }],
        logger: null,
      });
      assert.equal(result.consecutiveHighRejections, 2);
      assert.equal(result.haltedReason, null);
    });

    it("returns haltedReason when reaching max consecutive rejections", () => {
      const result = checkHighRejectionHalt({
        rejectionRate: 0.9,
        rejectionRateThreshold: 0.8,
        consecutiveHighRejections: 2,
        maxConsecutiveRejections: 3,
        generation: 7,
        rejected: [
          { reason: "degeneracy" },
          { reason: "degeneracy" },
          { reason: "invalid" },
        ],
        logger: null,
      });
      assert.equal(result.consecutiveHighRejections, 3);
      assert.deepStrictEqual(result.haltedReason, {
        generation: 7,
        rejectionRate: 0.9,
        consecutiveHighRejections: 3,
        dominantReason: "degeneracy",
      });
    });

    it("logs warning when halted", () => {
      const logger = { warn: mock.fn() };
      checkHighRejectionHalt({
        rejectionRate: 0.95,
        rejectionRateThreshold: 0.8,
        consecutiveHighRejections: 2,
        maxConsecutiveRejections: 3,
        generation: 4,
        rejected: [{ reason: "bad" }],
        logger,
      });
      assert.equal(logger.warn.mock.callCount(), 1);
    });
  });

  describe("checkPopulationExtinction", () => {
    function makeLoopResult({ nextGenLength = 0, evaluatedLength = 3, rejectedLength = 2 } = {}) {
      return {
        nextGeneration: Array.from({ length: nextGenLength }, (_, i) => ({ id: `g${i}` })),
        evaluated: Array.from({ length: evaluatedLength }, (_, i) => ({ fitness: i })),
        rejected: Array.from({ length: rejectedLength }, () => ({ reason: "test" })),
        mapElites: { elites: new Map() },
        shortlist: [],
      };
    }

    it("returns null when nextGeneration is non-empty", async () => {
      const result = await checkPopulationExtinction({
        generation: 0,
        loopResult: makeLoopResult({ nextGenLength: 5 }),
        currentPopulation: [{ id: "a", definition: {} }],
        telemetry: { operators: {} },
        snapshotProvider: null,
        runId: randomUUID(),
        baseDir: "/tmp/test-extinct",
        seed: 42,
        logger: null,
      });
      assert.equal(result, null);
    });

    it("returns haltedReason when nextGeneration is empty", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "tc-extinct-"));
      try {
        const result = await checkPopulationExtinction({
          generation: 3,
          loopResult: makeLoopResult({ nextGenLength: 0, evaluatedLength: 2, rejectedLength: 5 }),
          currentPopulation: [{ id: "a", definition: { name: "test" } }],
          telemetry: { operators: {} },
          snapshotProvider: ({ runId, generation }) => [defaultPreferenceModelSnapshot({ runId, generation, seed: 42 })],
          runId: randomUUID(),
          baseDir,
          seed: 42,
          logger: null,
        });
        assert.ok(result !== null);
        assert.deepStrictEqual(result.haltedReason, {
          generation: 3,
          cause: "population-extinction",
          evaluated: 2,
          rejected: 5,
        });
        assert.ok(result.artifacts !== undefined);
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });

    it("logs warning on extinction", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "tc-extinctlog-"));
      try {
        const logger = { warn: mock.fn() };
        await checkPopulationExtinction({
          generation: 1,
          loopResult: makeLoopResult({ nextGenLength: 0 }),
          currentPopulation: [{ id: "a", definition: {} }],
          telemetry: { operators: {} },
          snapshotProvider: ({ runId, generation }) => [defaultPreferenceModelSnapshot({ runId, generation, seed: 42 })],
          runId: randomUUID(),
          baseDir,
          seed: 42,
          logger,
        });
        assert.equal(logger.warn.mock.callCount(), 1);
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    });
  });
});
