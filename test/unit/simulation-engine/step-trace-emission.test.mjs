import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  applyAfterActionTriggers,
  buildStep,
  createStepImpact,
} from "../../../src/simulation-engine/step-execution.js";
import { defaultStateHasher } from "../../../src/simulation-engine/loop-detection.js";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefinition(variables = []) {
  return {
    state: { variables },
    turn: {},
    triggers: [],
  };
}

function makeState(overrides = {}) {
  return {
    turn: { turn: 1, phase: "main", currentPlayer: 1 },
    variables: { global: {}, perPlayer: { 1: {} } },
    tokens: [],
    zones: [],
    ...overrides,
  };
}

function makeVariable(id, scope = "global", kind = "int", initial = 0) {
  return { id, scope, type: { kind, min: 0, max: 100 }, initial };
}

// ---------------------------------------------------------------------------
// applyAction — trace collection
// ---------------------------------------------------------------------------

describe("applyAction trace collection", () => {
  it("returns empty appliedEffects for action with no costs or effects", () => {
    const definition = makeDefinition();
    const state = makeState();
    const action = {};
    const result = applyAction(definition, state, action, {});
    assert.ok(Array.isArray(result.appliedEffects));
    assert.equal(result.appliedEffects.length, 0);
  });

  it("returns empty appliedEffects for action with empty costs and effects arrays", () => {
    const definition = makeDefinition();
    const state = makeState();
    const action = { costs: [], effects: [] };
    const result = applyAction(definition, state, action, {});
    assert.deepEqual(result.appliedEffects, []);
  });

  it("collects cost appliedEffects with source: cost", () => {
    const variable = makeVariable("gold", "global", "int", 10);
    const definition = makeDefinition([variable]);
    const state = makeState({
      variables: { global: { gold: 10 }, perPlayer: { 1: {} } },
    });
    const action = {
      costs: [{ kind: "dec", amount: 3, target: { kind: "var", id: "gold" } }],
      effects: [],
    };
    const result = applyAction(definition, state, action, { playerId: 1 });
    assert.equal(result.appliedEffects.length, 1);
    assert.equal(result.appliedEffects[0].source, "cost");
    assert.equal(result.appliedEffects[0].kind, "dec");
    assert.equal(result.appliedEffects[0].amount, 3);
  });

  it("collects effect appliedEffects with source: effect", () => {
    const variable = makeVariable("score", "global", "int", 0);
    const definition = makeDefinition([variable]);
    const state = makeState({
      variables: { global: { score: 0 }, perPlayer: { 1: {} } },
    });
    const action = {
      costs: [],
      effects: [{ kind: "inc", amount: 5, target: { kind: "var", id: "score" } }],
    };
    const result = applyAction(definition, state, action, { playerId: 1 });
    assert.equal(result.appliedEffects.length, 1);
    assert.equal(result.appliedEffects[0].source, "effect");
    assert.equal(result.appliedEffects[0].kind, "inc");
    assert.equal(result.appliedEffects[0].amount, 5);
  });

  it("costs appear before effects in appliedEffects order", () => {
    const goldVar = makeVariable("gold", "global", "int", 10);
    const scoreVar = makeVariable("score", "global", "int", 0);
    const definition = makeDefinition([goldVar, scoreVar]);
    const state = makeState({
      variables: { global: { gold: 10, score: 0 }, perPlayer: { 1: {} } },
    });
    const action = {
      costs: [{ kind: "dec", amount: 2, target: { kind: "var", id: "gold" } }],
      effects: [{ kind: "inc", amount: 1, target: { kind: "var", id: "score" } }],
    };
    const result = applyAction(definition, state, action, { playerId: 1 });
    assert.equal(result.appliedEffects.length, 2);
    assert.equal(result.appliedEffects[0].source, "cost");
    assert.equal(result.appliedEffects[1].source, "effect");
  });
});

// ---------------------------------------------------------------------------
// applyAfterActionTriggers — trace collection
// ---------------------------------------------------------------------------

describe("applyAfterActionTriggers trace collection", () => {
  it("returns empty appliedEffects when no triggers exist", () => {
    const definition = makeDefinition();
    const state = makeState();
    const result = applyAfterActionTriggers(definition, state, {});
    assert.ok(Array.isArray(result.appliedEffects));
    assert.equal(result.appliedEffects.length, 0);
  });

  it("returns appliedEffects from fired triggers with source: trigger", () => {
    const variable = makeVariable("hp", "global", "int", 10);
    const definition = {
      state: { variables: [variable] },
      turn: {},
      triggers: [
        {
          event: "after_action",
          effects: [{ kind: "dec", amount: 1, target: { kind: "var", id: "hp" } }],
        },
      ],
    };
    const state = makeState({
      variables: { global: { hp: 10 }, perPlayer: { 1: {} } },
    });
    const result = applyAfterActionTriggers(definition, state, { playerId: 1 });
    assert.ok(result.appliedEffects.length > 0);
    assert.equal(result.appliedEffects[0].source, "trigger");
    assert.equal(result.appliedEffects[0].kind, "dec");
  });
});

// ---------------------------------------------------------------------------
// buildStep — trace fields
// ---------------------------------------------------------------------------

describe("buildStep trace fields", () => {
  function makeStepState() {
    return {
      turn: { turn: 2, phase: "action", currentPlayer: 1 },
      variables: { global: { score: 5 }, perPlayer: {} },
      tokens: [],
      zones: [],
    };
  }

  it("includes stateHash, bindings, appliedEffects when trace is provided", () => {
    const state = makeStepState();
    const trace = {
      stateHash: "abc123",
      bindings: {},
      appliedEffects: [{ kind: "inc", amount: 1, target: { kind: "var", id: "score", scope: "global" }, source: "effect" }],
    };
    const step = buildStep(state, "attack", 3, undefined, trace);
    assert.equal(step.stateHash, "abc123");
    assert.deepEqual(step.bindings, {});
    assert.equal(step.appliedEffects.length, 1);
    assert.equal(step.appliedEffects[0].source, "effect");
  });

  it("does not include trace fields when trace is not provided", () => {
    const state = makeStepState();
    const step = buildStep(state, "attack", 3);
    assert.equal(step.stateHash, undefined);
    assert.equal(step.bindings, undefined);
    assert.equal(step.appliedEffects, undefined);
  });

  it("preserves existing step fields when trace is provided", () => {
    const state = makeStepState();
    const impact = createStepImpact();
    impact.affectedGlobal = true;
    const trace = { stateHash: "hash", bindings: {}, appliedEffects: [] };
    const step = buildStep(state, "move", 2, impact, trace);
    assert.equal(step.turn, 2);
    assert.equal(step.phase, "action");
    assert.equal(step.playerId, 1);
    assert.equal(step.actionId, "move");
    assert.equal(step.legalActionCount, 2);
    assert.equal(step.affectedGlobal, true);
    assert.equal(step.stateHash, "hash");
  });
});

// ---------------------------------------------------------------------------
// defaultStateHasher determinism
// ---------------------------------------------------------------------------

describe("stateHash determinism", () => {
  it("same state produces same hash", () => {
    const state = makeState({
      variables: { global: { score: 7 }, perPlayer: { 1: { hp: 3 } } },
      tokens: [{ id: "t1", zone: "hand" }],
    });
    const hash1 = defaultStateHasher(state);
    const hash2 = defaultStateHasher(state);
    assert.equal(hash1, hash2);
    assert.ok(typeof hash1 === "string");
    assert.ok(hash1.length > 0);
  });

  it("different states produce different hashes", () => {
    const state1 = makeState({ variables: { global: { score: 1 }, perPlayer: {} } });
    const state2 = makeState({ variables: { global: { score: 2 }, perPlayer: {} } });
    assert.notEqual(defaultStateHasher(state1), defaultStateHasher(state2));
  });
});

// ---------------------------------------------------------------------------
// Integration: full simulation emits trace fields on non-pass steps
// ---------------------------------------------------------------------------

describe("simulation trace field integration", () => {
  it("non-pass trajectory steps include stateHash, bindings, appliedEffects", () => {
    const definition = createBaseDefinition();
    definition.actions = [createIncrementAction()];
    definition.termination.conditions = [
      {
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "counter" } },
          right: { kind: "value", value: 2 },
        },
        outcome: { type: "win", players: "active" },
      },
    ];

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });

    const result = engine.run();

    const nonPassSteps = result.trajectory.steps.filter(
      (step) => step.actionId != null
    );
    assert.ok(nonPassSteps.length > 0, "should have non-pass steps");

    for (const step of nonPassSteps) {
      assert.ok(
        typeof step.stateHash === "string" && step.stateHash.length > 0,
        `step should have non-empty stateHash, got: ${step.stateHash}`
      );
      assert.ok(
        typeof step.bindings === "object" && step.bindings !== null,
        "step should have bindings object"
      );
      assert.ok(
        Array.isArray(step.appliedEffects),
        "step should have appliedEffects array"
      );
    }

    // Verify appliedEffects contain tick action effects
    const firstActionStep = nonPassSteps[0];
    assert.ok(firstActionStep.appliedEffects.length > 0, "should have appliedEffects");
    assert.equal(firstActionStep.appliedEffects[0].source, "effect");
    assert.equal(firstActionStep.appliedEffects[0].kind, "inc");
  });
});
