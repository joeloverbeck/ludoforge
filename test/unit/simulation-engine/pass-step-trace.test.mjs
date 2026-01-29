import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createFirstActionAgent,
} from "./fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertPassStepTrace(step, label) {
  assert.equal(step.actionId, null, `${label}: actionId should be null`);
  assert.deepEqual(step.bindings, {}, `${label}: bindings should be {}`);
  assert.deepEqual(step.appliedEffects, [], `${label}: appliedEffects should be []`);
  assert.ok(
    typeof step.stateHash === "string" && step.stateHash.length > 0,
    `${label}: stateHash should be a non-empty string, got: ${step.stateHash}`
  );
}

// ---------------------------------------------------------------------------
// T2 — Pass-step trace rules
// ---------------------------------------------------------------------------

describe("pass-step trace rules", () => {
  it("pass policy emits bindings:{}, appliedEffects:[], and valid stateHash", () => {
    const definition = createBaseDefinition();
    definition.actions = [];
    definition.termination.conditions = [];
    definition.turn.noLegalActions = { policy: "pass" };

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
      maxTurns: 1,
    });

    const result = engine.run();

    assert.equal(result.terminationReason, "max-turns");
    assert.equal(result.trajectory.steps.length, 1);
    assertPassStepTrace(result.trajectory.steps[0], "pass-policy");
  });

  it("stalemate detection emits pass-step trace fields", () => {
    const definition = createBaseDefinition();
    definition.actions = [];
    definition.termination.conditions = [];
    // No noLegalActions policy → stalemate fallback

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();

    assert.equal(result.terminationReason, "stalemate");
    assert.equal(result.trajectory.steps.length, 1);
    assertPassStepTrace(result.trajectory.steps[0], "stalemate");
  });

  it("terminate policy emits pass-step trace fields", () => {
    const definition = createBaseDefinition();
    definition.actions = [];
    definition.termination.conditions = [];
    definition.turn.noLegalActions = {
      policy: "terminate",
      defaultOutcome: { type: "win", players: "active" },
      reason: "no-actions",
    };

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();

    assert.equal(result.terminationReason, "no-legal-actions");
    assert.equal(result.trajectory.steps.length, 1);
    assertPassStepTrace(result.trajectory.steps[0], "terminate-policy");
  });

  it("stateHash on pass step reflects actual game state", () => {
    const definition = createBaseDefinition();
    definition.state.variables = [
      { id: "counter", scope: "global", type: { kind: "int" }, initial: 42 },
    ];
    definition.actions = [];
    definition.termination.conditions = [];

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const step = result.trajectory.steps[0];

    // stateHash should be deterministic — same state → same hash
    assert.ok(typeof step.stateHash === "string" && step.stateHash.length > 0);

    // Run again to verify determinism
    const engine2 = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const result2 = engine2.run();
    assert.equal(
      result2.trajectory.steps[0].stateHash,
      step.stateHash,
      "stateHash should be deterministic for identical state"
    );
  });

  it("pass policy with loop detection emits trace on all pass steps", () => {
    const definition = createBaseDefinition();
    definition.actions = [];
    definition.termination.conditions = [];
    definition.turn.noLegalActions = { policy: "pass" };

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
      loopDetection: { maxRepeatedStates: 2 },
    });

    const result = engine.run();

    assert.equal(result.terminationReason, "loop-detected");
    assert.ok(result.trajectory.steps.length >= 1);

    for (const step of result.trajectory.steps) {
      assertPassStepTrace(step, "pass-with-loop-detection");
    }
  });
});
