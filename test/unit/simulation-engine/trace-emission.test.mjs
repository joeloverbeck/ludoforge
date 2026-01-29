import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import { defaultStateHasher } from "../../../src/simulation-engine/loop-detection.js";
import { createFirstActionAgent } from "./fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a definition with gold (10), score (0), hp (100).
 * Action "attack": cost dec gold 2, effect inc score 1.
 * Trigger: after_action dec hp 1.
 * Terminate when score >= threshold.
 */
function createCombinedDefinition(scoreThreshold = 1) {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [
        { id: "gold", scope: "global", type: { kind: "int" }, initial: 10 },
        { id: "score", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "hp", scope: "global", type: { kind: "int" }, initial: 100 },
      ],
    },
    actions: [
      {
        id: "attack",
        actor: "player",
        costs: [{ kind: "dec", amount: 2, target: { kind: "var", id: "gold" } }],
        effects: [{ kind: "inc", amount: 1, target: { kind: "var", id: "score" } }],
      },
    ],
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: scoreThreshold },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [
      {
        event: "after_action",
        effects: [{ kind: "dec", amount: 1, target: { kind: "var", id: "hp" } }],
      },
    ],
  };
}

/**
 * Build a definition with a cost-only action (no effects, no triggers).
 */
function createCostOnlyDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [
        { id: "gold", scope: "global", type: { kind: "int" }, initial: 10 },
      ],
    },
    actions: [
      {
        id: "spend",
        actor: "player",
        costs: [{ kind: "dec", amount: 1, target: { kind: "var", id: "gold" } }],
        effects: [],
      },
    ],
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "gold" } },
            right: { kind: "value", value: 8 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

// ---------------------------------------------------------------------------
// T1 — Combined trace emission through full simulation loop
// ---------------------------------------------------------------------------

describe("T1: combined trace emission through full loop", () => {
  it("action with cost + effect + trigger produces correct ordered appliedEffects", () => {
    const definition = createCombinedDefinition(1);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 1, "should have at least one action step");

    const step = actionSteps[0];
    assert.equal(step.appliedEffects.length, 3, "should have 3 appliedEffects: cost, effect, trigger");

    // Order: cost first, effect second, trigger third
    assert.equal(step.appliedEffects[0].source, "cost");
    assert.equal(step.appliedEffects[0].kind, "dec");
    assert.equal(step.appliedEffects[0].amount, 2);
    assert.deepEqual(step.appliedEffects[0].target, { kind: "var", id: "gold", scope: "global" });

    assert.equal(step.appliedEffects[1].source, "effect");
    assert.equal(step.appliedEffects[1].kind, "inc");
    assert.equal(step.appliedEffects[1].amount, 1);
    assert.deepEqual(step.appliedEffects[1].target, { kind: "var", id: "score", scope: "global" });

    assert.equal(step.appliedEffects[2].source, "trigger");
    assert.equal(step.appliedEffects[2].kind, "dec");
    assert.equal(step.appliedEffects[2].amount, 1);
    assert.deepEqual(step.appliedEffects[2].target, { kind: "var", id: "hp", scope: "global" });
  });

  it("bindings is present as empty object", () => {
    const definition = createCombinedDefinition(1);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);

    for (const step of actionSteps) {
      assert.deepEqual(step.bindings, {}, "bindings should be empty object");
    }
  });

  it("stateHash matches defaultStateHasher(step.state)", () => {
    const definition = createCombinedDefinition(1);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);

    for (const step of actionSteps) {
      const computed = defaultStateHasher(step.state);
      assert.equal(step.stateHash, computed, "stateHash should match defaultStateHasher(step.state)");
    }
  });

  it("multi-step trajectory has trace on every action step with differing hashes", () => {
    const definition = createCombinedDefinition(3);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 3, "should have at least 3 action steps");

    for (const step of actionSteps) {
      assert.ok(typeof step.stateHash === "string" && step.stateHash.length > 0, "stateHash present");
      assert.ok(typeof step.bindings === "object" && step.bindings !== null, "bindings present");
      assert.ok(Array.isArray(step.appliedEffects), "appliedEffects present");
    }

    // Consecutive stateHashes should differ (state changes each step)
    for (let i = 1; i < actionSteps.length; i++) {
      assert.notEqual(
        actionSteps[i].stateHash,
        actionSteps[i - 1].stateHash,
        `stateHash should differ between step ${i - 1} and ${i}`
      );
    }
  });

  it("action with only costs produces cost-only appliedEffects", () => {
    const definition = createCostOnlyDefinition();
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 1, "should have at least one action step");

    for (const step of actionSteps) {
      assert.ok(step.appliedEffects.length >= 1, "should have at least one appliedEffect");
      for (const effect of step.appliedEffects) {
        assert.equal(effect.source, "cost", "all appliedEffects should have source: cost");
      }
    }
  });
});
