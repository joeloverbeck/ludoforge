import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createTelemetry,
  mergeTelemetry,
  recordNoOp,
  recordRepairFailed,
  recordRejection,
  recordEvaluated,
  recordValidEvaluated,
} from "../../../src/evolution-runner/operator-telemetry.js";

describe("expanded operator telemetry counters", () => {
  describe("createTelemetry initializes new counters", () => {
    it("noOp initializes to 0", () => {
      const t = createTelemetry(["op1"]);
      assert.equal(t.operators.op1.noOp, 0);
    });

    it("repairFailed initializes to 0", () => {
      const t = createTelemetry(["op1"]);
      assert.equal(t.operators.op1.repairFailed, 0);
    });

    it("rejected initializes with all sub-keys at 0", () => {
      const t = createTelemetry(["op1"]);
      assert.deepStrictEqual(t.operators.op1.rejected, {
        validationFailure: 0,
        safetyFailure: 0,
        evaluationError: 0,
        evaluationNull: 0,
      });
    });

    it("evaluated initializes to 0", () => {
      const t = createTelemetry(["op1"]);
      assert.equal(t.operators.op1.evaluated, 0);
    });

    it("validEvaluated initializes to 0", () => {
      const t = createTelemetry(["op1"]);
      assert.equal(t.operators.op1.validEvaluated, 0);
    });

    it("preserves existing counters alongside new ones", () => {
      const t = createTelemetry(["op1"]);
      assert.equal(t.operators.op1.attempts, 0);
      assert.equal(t.operators.op1.gridContributions.filledEmpty, 0);
      assert.equal(t.operators.op1.gridContributions.improvedElite, 0);
    });
  });

  describe("recordNoOp", () => {
    it("increments noOp counter", () => {
      const t = createTelemetry(["op1"]);
      recordNoOp(t, "op1");
      assert.equal(t.operators.op1.noOp, 1);
    });

    it("increments only the targeted operator", () => {
      const t = createTelemetry(["op1", "op2"]);
      recordNoOp(t, "op1");
      assert.equal(t.operators.op1.noOp, 1);
      assert.equal(t.operators.op2.noOp, 0);
    });
  });

  describe("recordRepairFailed", () => {
    it("increments repairFailed counter", () => {
      const t = createTelemetry(["op1"]);
      recordRepairFailed(t, "op1");
      recordRepairFailed(t, "op1");
      assert.equal(t.operators.op1.repairFailed, 2);
    });
  });

  describe("recordRejection", () => {
    it("increments validationFailure sub-key", () => {
      const t = createTelemetry(["op1"]);
      recordRejection(t, "op1", "validationFailure");
      assert.equal(t.operators.op1.rejected.validationFailure, 1);
      assert.equal(t.operators.op1.rejected.safetyFailure, 0);
    });

    it("increments safetyFailure sub-key", () => {
      const t = createTelemetry(["op1"]);
      recordRejection(t, "op1", "safetyFailure");
      assert.equal(t.operators.op1.rejected.safetyFailure, 1);
    });

    it("increments evaluationError sub-key", () => {
      const t = createTelemetry(["op1"]);
      recordRejection(t, "op1", "evaluationError");
      assert.equal(t.operators.op1.rejected.evaluationError, 1);
    });

    it("increments evaluationNull sub-key", () => {
      const t = createTelemetry(["op1"]);
      recordRejection(t, "op1", "evaluationNull");
      assert.equal(t.operators.op1.rejected.evaluationNull, 1);
    });

    it("throws on invalid rejection reason", () => {
      const t = createTelemetry(["op1"]);
      assert.throws(
        () => recordRejection(t, "op1", "badReason"),
        /Invalid rejection reason/,
      );
    });

    it("accumulates multiple rejections across sub-keys", () => {
      const t = createTelemetry(["op1"]);
      recordRejection(t, "op1", "validationFailure");
      recordRejection(t, "op1", "validationFailure");
      recordRejection(t, "op1", "safetyFailure");
      assert.equal(t.operators.op1.rejected.validationFailure, 2);
      assert.equal(t.operators.op1.rejected.safetyFailure, 1);
    });
  });

  describe("recordEvaluated", () => {
    it("increments evaluated counter", () => {
      const t = createTelemetry(["op1"]);
      recordEvaluated(t, "op1");
      assert.equal(t.operators.op1.evaluated, 1);
    });
  });

  describe("recordValidEvaluated", () => {
    it("increments validEvaluated counter", () => {
      const t = createTelemetry(["op1"]);
      recordValidEvaluated(t, "op1");
      assert.equal(t.operators.op1.validEvaluated, 1);
    });
  });

  describe("mergeTelemetry with new counters", () => {
    it("sums scalar new counters", () => {
      const a = createTelemetry(["op1"]);
      const b = createTelemetry(["op1"]);

      recordNoOp(a, "op1");
      recordNoOp(a, "op1");
      recordRepairFailed(a, "op1");
      recordEvaluated(a, "op1");
      recordValidEvaluated(a, "op1");

      recordNoOp(b, "op1");
      recordRepairFailed(b, "op1");
      recordRepairFailed(b, "op1");
      recordEvaluated(b, "op1");
      recordEvaluated(b, "op1");
      recordValidEvaluated(b, "op1");

      const merged = mergeTelemetry(a, b);

      assert.equal(merged.operators.op1.noOp, 3);
      assert.equal(merged.operators.op1.repairFailed, 3);
      assert.equal(merged.operators.op1.evaluated, 3);
      assert.equal(merged.operators.op1.validEvaluated, 2);
    });

    it("sums rejected sub-keys", () => {
      const a = createTelemetry(["op1"]);
      const b = createTelemetry(["op1"]);

      recordRejection(a, "op1", "validationFailure");
      recordRejection(a, "op1", "safetyFailure");
      recordRejection(a, "op1", "evaluationError");

      recordRejection(b, "op1", "validationFailure");
      recordRejection(b, "op1", "evaluationNull");
      recordRejection(b, "op1", "evaluationNull");

      const merged = mergeTelemetry(a, b);

      assert.deepStrictEqual(merged.operators.op1.rejected, {
        validationFailure: 2,
        safetyFailure: 1,
        evaluationError: 1,
        evaluationNull: 2,
      });
    });

    it("preserves existing counters during merge", () => {
      const a = createTelemetry(["op1"]);
      const b = createTelemetry(["op1"]);

      a.operators.op1.attempts = 5;
      b.operators.op1.attempts = 2;

      const merged = mergeTelemetry(a, b);

      assert.equal(merged.operators.op1.attempts, 7);
    });

    it("merges across multiple operators", () => {
      const a = createTelemetry(["op1", "op2"]);
      const b = createTelemetry(["op1", "op2"]);

      recordNoOp(a, "op1");
      recordRepairFailed(a, "op2");

      recordNoOp(b, "op2");
      recordRepairFailed(b, "op1");

      const merged = mergeTelemetry(a, b);

      assert.equal(merged.operators.op1.noOp, 1);
      assert.equal(merged.operators.op1.repairFailed, 1);
      assert.equal(merged.operators.op2.noOp, 1);
      assert.equal(merged.operators.op2.repairFailed, 1);
    });
  });
});
