import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeHealthMetrics } from "../../../src/evolution-runner/health-metrics.js";

describe("health-metrics", () => {
  describe("computeHealthMetrics", () => {
    it("computes mean and median fitness from evaluated entries", () => {
      const evaluated = [
        { fitness: 1, diagnostics: {} },
        { fitness: 3, diagnostics: {} },
        { fitness: 5, diagnostics: {} },
      ];
      const result = computeHealthMetrics({
        evaluated,
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.equal(result.meanFitness, 3);
      assert.equal(result.medianFitness, 3);
    });

    it("computes median for even-length arrays", () => {
      const evaluated = [
        { fitness: 1, diagnostics: {} },
        { fitness: 3, diagnostics: {} },
        { fitness: 5, diagnostics: {} },
        { fitness: 7, diagnostics: {} },
      ];
      const result = computeHealthMetrics({
        evaluated,
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.equal(result.meanFitness, 4);
      assert.equal(result.medianFitness, 4);
    });

    it("returns sensible defaults for empty evaluated array", () => {
      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.equal(result.meanFitness, 0);
      assert.equal(result.medianFitness, 0);
      assert.equal(result.rejectionRate, 0);
      assert.deepEqual(result.rejectionReasons, {});
      assert.deepEqual(result.degeneracyFlags, {});
      assert.equal(result.nicheOccupancy, 0);
      assert.equal(result.repairFailureRate, 0);
    });

    it("computes rejection rate and reason counts", () => {
      const evaluated = [{ fitness: 1, diagnostics: {} }];
      const rejected = [
        { reason: "repair-failure" },
        { reason: "repair-failure" },
        { reason: "validation-failure" },
      ];

      const result = computeHealthMetrics({
        evaluated,
        rejected,
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.equal(result.rejectionRate, 3 / 4);
      assert.deepEqual(result.rejectionReasons, {
        "repair-failure": 2,
        "validation-failure": 1,
      });
    });

    it("counts degeneracy flag frequency across evaluated entries", () => {
      const evaluated = [
        { fitness: 1, diagnostics: { evaluation: { degeneracy: { flags: ["forced-move", "stalemate"] } } } },
        { fitness: 2, diagnostics: { evaluation: { degeneracy: { flags: ["forced-move"] } } } },
        { fitness: 3, diagnostics: { evaluation: { degeneracy: { flags: [] } } } },
        { fitness: 4, diagnostics: {} },
      ];

      const result = computeHealthMetrics({
        evaluated,
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.deepEqual(result.degeneracyFlags, {
        "forced-move": 2,
        "stalemate": 1,
      });
    });

    it("reports niche occupancy from mapElites", () => {
      const elites = new Map();
      elites.set("niche-0", { genome: { id: "a" } });
      elites.set("niche-1", { genome: { id: "b" } });
      elites.set("niche-2", { genome: { id: "c" } });

      const result = computeHealthMetrics({
        evaluated: [{ fitness: 1, diagnostics: {} }],
        rejected: [],
        mapElites: { elites },
        telemetry: null,
      });

      assert.equal(result.nicheOccupancy, 3);
    });

    it("computes repair failure rate from telemetry", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 10, validOffspring: 8 },
          "action-remove": { attempts: 5, validOffspring: 2 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [{ fitness: 1, diagnostics: {} }],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      // (10+5) - (8+2) = 5 failures out of 15 attempts
      assert.equal(result.repairFailureRate, 5 / 15);
    });

    it("all numeric fields are finite numbers", () => {
      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.ok(Number.isFinite(result.meanFitness));
      assert.ok(Number.isFinite(result.medianFitness));
      assert.ok(Number.isFinite(result.rejectionRate));
      assert.ok(Number.isFinite(result.nicheOccupancy));
      assert.ok(Number.isFinite(result.repairFailureRate));
    });

    it("handles non-finite fitness values gracefully", () => {
      const evaluated = [
        { fitness: NaN, diagnostics: {} },
        { fitness: Infinity, diagnostics: {} },
        { fitness: 4, diagnostics: {} },
      ];

      const result = computeHealthMetrics({
        evaluated,
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      // Only fitness=4 is finite, so mean=4, median=4
      assert.equal(result.meanFitness, 4);
      assert.equal(result.medianFitness, 4);
    });

    it("assigns unknown reason when rejected entry has no reason", () => {
      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [{}],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.deepEqual(result.rejectionReasons, { unknown: 1 });
    });

    it("returns repairFailureRate 0 when telemetry has zero attempts", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 0, validOffspring: 0 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.repairFailureRate, 0);
    });
  });
});
