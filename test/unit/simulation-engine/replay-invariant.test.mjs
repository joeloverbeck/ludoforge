import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import { defaultStateHasher } from "../../../src/simulation-engine/loop-detection.js";
import { cloneState } from "../../../src/simulation-engine/step-execution.js";
import {
  verifyTraceConsistency,
  replayEffectsOnState,
} from "../../../src/simulation-engine/replay.js";
import { createBaseDefinition, createFirstActionAgent } from "./fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple counter game: inc counter each step. Terminates at threshold. */
function createCounterDefinition(threshold = 3) {
  const def = createBaseDefinition();
  def.actions = [
    {
      id: "tick",
      actor: "player",
      effects: [{ kind: "inc", amount: 1, target: { kind: "var", id: "counter" } }],
    },
  ];
  def.termination.conditions = [
    {
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "counter" } },
        right: { kind: "value", value: threshold },
      },
      outcome: { type: "win", players: "active" },
    },
  ];
  return def;
}

/** Combined definition: gold/score/hp with trigger. */
function createCombinedDefinition(scoreThreshold = 2) {
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

/** Two-action definition: "attack" (dec gold, inc score) and "heal" (inc hp). */
function createTwoActionDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [
        { id: "gold", scope: "global", type: { kind: "int" }, initial: 10 },
        { id: "score", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "hp", scope: "global", type: { kind: "int" }, initial: 5 },
      ],
    },
    actions: [
      {
        id: "attack",
        actor: "player",
        costs: [{ kind: "dec", amount: 1, target: { kind: "var", id: "gold" } }],
        effects: [{ kind: "inc", amount: 1, target: { kind: "var", id: "score" } }],
      },
      {
        id: "heal",
        actor: "player",
        effects: [{ kind: "inc", amount: 2, target: { kind: "var", id: "hp" } }],
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
            right: { kind: "value", value: 2 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

/** Agent that alternates between available actions. */
function createAlternatingAgent() {
  let callCount = 0;
  return {
    selectAction({ legalActions }) {
      const index = callCount % legalActions.length;
      callCount += 1;
      return legalActions[index]?.id;
    },
  };
}

/**
 * Replay appliedEffects forward from initial state, comparing
 * variables at each step with the recorded step.state.variables.
 */
function replayForward(steps, initialState) {
  let current = cloneState(initialState);
  const failures = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.appliedEffects) {
      continue;
    }
    current = replayEffectsOnState(current, step.appliedEffects, {
      playerId: step.playerId,
    });
    // After applying effects, advance turn to match recorded state
    // We only compare variables — turn/phase advancement is handled by the kernel
    if (!deepEqualVariables(current.variables, step.state.variables)) {
      failures.push({
        index: i,
        expected: step.state.variables,
        actual: current.variables,
      });
    }
  }
  return { ok: failures.length === 0, failures };
}

function deepEqualVariables(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// T3 — Replay invariant tests
// ---------------------------------------------------------------------------

describe("T3: replay invariant", () => {
  it("stateHash matches defaultStateHasher(step.state) for every step", async () => {
    const definition = createCounterDefinition(3);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const result = await engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 3);

    for (const step of actionSteps) {
      const computed = defaultStateHasher(step.state);
      assert.equal(step.stateHash, computed, "stateHash must match recomputed hash");
    }
  });

  it("replaying appliedEffects forward reproduces state variables at each step", async () => {
    const definition = createCounterDefinition(3);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const result = await engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 3);

    // Initial state: counter = 0 (1 player → perPlayer has key "1")
    const initialState = {
      variables: { global: { counter: 0 }, perPlayer: { 1: {} } },
      tokens: [],
      zones: [],
      turn: { turn: 1, phase: "main", currentPlayer: 1 },
    };
    const replay = replayForward(actionSteps, initialState);
    assert.ok(replay.ok, `Replay failures: ${JSON.stringify(replay.failures)}`);
  });

  it("replay with costs + effects + triggers", async () => {
    const definition = createCombinedDefinition(2);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const result = await engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 2);

    const initialState = {
      variables: { global: { gold: 10, score: 0, hp: 100 }, perPlayer: { 1: {} } },
      tokens: [],
      zones: [],
      turn: { turn: 1, phase: "main", currentPlayer: 1 },
    };
    const replay = replayForward(actionSteps, initialState);
    assert.ok(replay.ok, `Replay failures: ${JSON.stringify(replay.failures)}`);
  });

  it("replay works for multi-step with varying action types", async () => {
    const definition = createTwoActionDefinition();
    const engine = createSimulationEngine({
      definition,
      agents: [createAlternatingAgent()],
    });
    const result = await engine.run();
    const actionSteps = result.trajectory.steps.filter((s) => s.actionId != null);
    assert.ok(actionSteps.length >= 2, "should have multiple action steps");

    const initialState = {
      variables: { global: { gold: 10, score: 0, hp: 5 }, perPlayer: { 1: {} } },
      tokens: [],
      zones: [],
      turn: { turn: 1, phase: "main", currentPlayer: 1 },
    };
    const replay = replayForward(actionSteps, initialState);
    assert.ok(replay.ok, `Replay failures: ${JSON.stringify(replay.failures)}`);
  });

  it("pass step with empty appliedEffects does not alter state", async () => {
    const definition = createBaseDefinition();
    definition.actions = [];
    definition.termination.conditions = [];
    definition.turn.noLegalActions = { policy: "pass" };

    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
      maxTurns: 2,
    });
    const result = await engine.run();
    const passSteps = result.trajectory.steps.filter((s) => s.actionId == null);
    assert.ok(passSteps.length >= 1, "should have pass steps");

    // All pass steps have empty appliedEffects
    for (const step of passSteps) {
      assert.deepEqual(step.appliedEffects, [], "pass step should have empty appliedEffects");
    }

    // Replay: applying empty effects should not change variables
    const initialState = {
      variables: { global: { counter: 0 }, perPlayer: {} },
      tokens: [],
      zones: [],
      turn: { turn: 1, phase: "main", currentPlayer: 1 },
    };
    let current = cloneState(initialState);
    for (const step of passSteps) {
      current = replayEffectsOnState(current, step.appliedEffects);
    }
    assert.deepEqual(current.variables, initialState.variables, "variables unchanged after pass steps");
  });

  it("verifyTraceConsistency returns ok:true for valid simulation output", async () => {
    const definition = createCounterDefinition(3);
    const engine = createSimulationEngine({
      definition,
      agents: [createFirstActionAgent()],
    });
    const result = await engine.run();

    const consistency = verifyTraceConsistency(result.trajectory.steps);
    assert.equal(consistency.ok, true, `Trace consistency failures: ${JSON.stringify(consistency.failures)}`);
  });
});
