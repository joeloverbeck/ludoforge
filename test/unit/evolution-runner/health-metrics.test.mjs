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
      assert.equal(result.operatorInefficiencyRate, 0);
      assert.equal(result.repairFailureRate, 0);
      assert.equal(result.noOpRate, 0);
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
      assert.ok(Number.isFinite(result.operatorInefficiencyRate));
      assert.ok(Number.isFinite(result.repairFailureRate));
      assert.ok(Number.isFinite(result.noOpRate));
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
  });

  describe("operator rate metrics", () => {
    it("computes operatorInefficiencyRate correctly", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 60, validEvaluated: 40, repairFailed: 5, noOp: 10 },
          "action-remove": { attempts: 40, validEvaluated: 20, repairFailed: 5, noOp: 5 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      // total attempts=100, totalValidEvaluated=60
      // (100 - 60) / 100 = 0.4
      assert.equal(result.operatorInefficiencyRate, 0.4);
    });

    it("computes repairFailureRate correctly from repairFailed counters", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 50, validEvaluated: 30, repairFailed: 10, noOp: 5 },
          "action-remove": { attempts: 50, validEvaluated: 20, repairFailed: 5, noOp: 10 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      // totalRepairFailed=15, totalAttempts=100
      // 15 / 100 = 0.15
      assert.equal(result.repairFailureRate, 0.15);
    });

    it("computes noOpRate correctly from noOp counters", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 60, validEvaluated: 30, repairFailed: 5, noOp: 15 },
          "action-remove": { attempts: 40, validEvaluated: 20, repairFailed: 5, noOp: 10 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      // totalNoOp=25, totalAttempts=100
      // 25 / 100 = 0.25
      assert.equal(result.noOpRate, 0.25);
    });

    it("returns all rates as 0 when attempts is 0", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 0, validEvaluated: 0, repairFailed: 0, noOp: 0 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.operatorInefficiencyRate, 0);
      assert.equal(result.repairFailureRate, 0);
      assert.equal(result.noOpRate, 0);
    });

    it("returns all rates as 0 when telemetry is null", () => {
      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: null,
      });

      assert.equal(result.operatorInefficiencyRate, 0);
      assert.equal(result.repairFailureRate, 0);
      assert.equal(result.noOpRate, 0);
    });

    it("returns all rates as 0 when telemetry has no operators", () => {
      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry: {},
      });

      assert.equal(result.operatorInefficiencyRate, 0);
      assert.equal(result.repairFailureRate, 0);
      assert.equal(result.noOpRate, 0);
    });

    it("operatorInefficiencyRate is 1.0 when no operator produces valid evaluated output", () => {
      const telemetry = {
        operators: {
          "numeric-tweak": { attempts: 50, validEvaluated: 0, repairFailed: 20, noOp: 30 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.operatorInefficiencyRate, 1.0);
    });

    it("matches ticket acceptance criteria: operatorInefficiencyRate = (100-60)/100 = 0.4", () => {
      const telemetry = {
        operators: {
          a: { attempts: 100, validEvaluated: 60, repairFailed: 10, noOp: 20 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.operatorInefficiencyRate, 0.4);
    });

    it("matches ticket acceptance criteria: repairFailureRate = 15/100 = 0.15", () => {
      const telemetry = {
        operators: {
          a: { attempts: 100, validEvaluated: 60, repairFailed: 15, noOp: 10 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.repairFailureRate, 0.15);
    });

    it("matches ticket acceptance criteria: noOpRate = 25/100 = 0.25", () => {
      const telemetry = {
        operators: {
          a: { attempts: 100, validEvaluated: 60, repairFailed: 10, noOp: 25 },
        },
      };

      const result = computeHealthMetrics({
        evaluated: [],
        rejected: [],
        mapElites: { elites: new Map() },
        telemetry,
      });

      assert.equal(result.noOpRate, 0.25);
    });
  });
});
