import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { recordGenerationTelemetry } from "../../src/evolution-runner/operator-telemetry-recorder.js";
import { createTelemetry } from "../../src/evolution-runner/operator-telemetry.js";

function makeGenome(id) {
  return { id, definition: {} };
}

function makeLoopResult({ evaluated = [], rejected = [], placements = [] } = {}) {
  return {
    evaluated,
    rejected,
    mapElites: { placements },
  };
}

describe("operator-telemetry-recorder integration", () => {
  it("records outcomes for operators with grid contributions", () => {
    const genome = makeGenome("g-1");
    const telemetry = createTelemetry(["op-a"]);
    const loopResult = makeLoopResult({
      evaluated: [{ genome, fitness: 1, descriptors: {} }],
      placements: [
        { member: { genome }, contributionKind: "filledEmpty" },
      ],
    });

    recordGenerationTelemetry({
      pendingOperatorNames: ["op-a"],
      loopResult,
      currentPopulation: [genome],
      telemetry,
      mutationSelector: null,
    });

    const counters = telemetry.operators["op-a"];
    assert.ok(counters.validEvaluated > 0,
      "should record validEvaluated for the operator");
  });

  it("increments evaluated count for evaluated genomes", () => {
    const genome = makeGenome("g-1");
    const telemetry = createTelemetry(["op-a"]);
    const loopResult = makeLoopResult({
      evaluated: [{ genome, fitness: 1, descriptors: {} }],
      placements: [
        { member: { genome }, contributionKind: "displaced" },
      ],
    });

    recordGenerationTelemetry({
      pendingOperatorNames: ["op-a"],
      loopResult,
      currentPopulation: [genome],
      telemetry,
      mutationSelector: null,
    });

    assert.ok(telemetry.operators["op-a"].evaluated > 0);
  });

  it("increments validEvaluated for filledEmpty contributions", () => {
    const genome = makeGenome("g-1");
    const telemetry = createTelemetry(["op-a"]);
    const loopResult = makeLoopResult({
      evaluated: [{ genome, fitness: 1, descriptors: {} }],
      placements: [
        { member: { genome }, contributionKind: "filledEmpty" },
      ],
    });

    recordGenerationTelemetry({
      pendingOperatorNames: ["op-a"],
      loopResult,
      currentPopulation: [genome],
      telemetry,
      mutationSelector: null,
    });

    assert.ok(telemetry.operators["op-a"].validEvaluated > 0);
  });

  it("calls selector.observe() with updated telemetry", () => {
    const genome = makeGenome("g-1");
    const telemetry = createTelemetry(["op-a"]);
    let observedTelemetry = null;
    const selector = {
      observe(t) { observedTelemetry = t; },
    };
    const loopResult = makeLoopResult({
      evaluated: [{ genome, fitness: 1, descriptors: {} }],
      mapElitesEntries: [],
    });

    recordGenerationTelemetry({
      pendingOperatorNames: ["op-a"],
      loopResult,
      currentPopulation: [genome],
      telemetry,
      mutationSelector: selector,
    });

    assert.equal(observedTelemetry, telemetry);
  });

  it("no-ops when pendingOperatorNames is null (first generation)", () => {
    const genome = makeGenome("g-1");
    const telemetry = createTelemetry(["op-a"]);
    const loopResult = makeLoopResult({
      evaluated: [{ genome, fitness: 1, descriptors: {} }],
    });

    recordGenerationTelemetry({
      pendingOperatorNames: null,
      loopResult,
      currentPopulation: [genome],
      telemetry,
      mutationSelector: null,
    });

    assert.equal(telemetry.operators["op-a"].evaluated, 0);
  });

  it("no-ops selector.observe when selector is null", () => {
    const telemetry = createTelemetry(["op-a"]);
    const loopResult = makeLoopResult({ evaluated: [] });

    assert.doesNotThrow(() => {
      recordGenerationTelemetry({
        pendingOperatorNames: null,
        loopResult,
        currentPopulation: [],
        telemetry,
        mutationSelector: null,
      });
    });
  });
});
