import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createTelemetry,
  mergeTelemetry,
  recordAttempt,
  recordOutcome,
  serializeTelemetry,
} from "../../../src/evolution-runner/operator-telemetry.js";

describe("operator telemetry", () => {
  it("createTelemetry initializes counters", () => {
    const telemetry = createTelemetry(["alpha", "beta"]);

    assert.equal(telemetry.operators.alpha.attempts, 0);
    assert.equal(telemetry.operators.alpha.gridContributions.filledEmpty, 0);
    assert.equal(telemetry.operators.alpha.gridContributions.improvedElite, 0);
  });

  it("recordAttempt increments attempts", () => {
    const telemetry = createTelemetry(["alpha"]);
    recordAttempt(telemetry, "alpha");
    assert.equal(telemetry.operators.alpha.attempts, 1);
  });

  it("recordOutcome increments grid contribution counters", () => {
    const telemetry = createTelemetry(["alpha"]);
    recordAttempt(telemetry, "alpha");
    recordOutcome(telemetry, "alpha", {
      gridContribution: "filledEmpty",
    });

    assert.equal(telemetry.operators.alpha.gridContributions.filledEmpty, 1);
    assert.equal(telemetry.operators.alpha.gridContributions.improvedElite, 0);
  });

  it("mergeTelemetry sums counters", () => {
    const first = createTelemetry(["alpha"]);
    recordAttempt(first, "alpha");
    recordOutcome(first, "alpha", { gridContribution: "filledEmpty" });

    const second = createTelemetry(["alpha"]);
    recordAttempt(second, "alpha");
    recordOutcome(second, "alpha", { gridContribution: "improvedElite" });

    const merged = mergeTelemetry(first, second);

    assert.equal(merged.operators.alpha.attempts, 2);
    assert.equal(merged.operators.alpha.gridContributions.filledEmpty, 1);
    assert.equal(merged.operators.alpha.gridContributions.improvedElite, 1);
  });

  it("serializeTelemetry returns JSON-serializable output", () => {
    const telemetry = createTelemetry(["alpha"]);
    recordAttempt(telemetry, "alpha");

    const serialized = serializeTelemetry(telemetry);
    assert.equal(typeof serialized, "object");
    assert.doesNotThrow(() => JSON.stringify(serialized));
  });

  it("throws on unknown operator name", () => {
    const telemetry = createTelemetry(["alpha"]);
    assert.throws(() => recordAttempt(telemetry, "beta"), /unknown operator/i);
  });
});
