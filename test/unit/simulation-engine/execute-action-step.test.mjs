import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeActionStep } from "../../../src/simulation-engine/execute-action-step.js";
import { buildPassStep } from "../../../src/simulation-engine/step-execution.js";
import {
  createInitialState,
  createEventStream,
} from "../../../src/game-kernel/index.js";
import {
  createBaseDefinition,
  createNoopAction,
  createIncrementAction,
} from "./fixtures.mjs";

/** Helper: run executeActionStep with sensible defaults, return the recorded step. */
function runStep(overrides = {}) {
  const definition = overrides.definition ?? createBaseDefinition();
  const action = overrides.action ?? createNoopAction();
  if (!definition.actions?.length) {
    definition.actions = [action];
  }
  const state = overrides.state ?? createInitialState(definition);
  const events = createEventStream();
  const trajectory = { steps: [], events };
  const context = overrides.context ?? { playerId: 1, phase: "main", turn: 1 };

  executeActionStep({
    definition,
    state,
    action,
    context,
    legalActionCount: overrides.legalActionCount ?? 1,
    rng: undefined,
    events,
    trajectory,
    stepControl: overrides.stepControl,
    args: overrides.args,
    decisionSpaceRaw: overrides.decisionSpaceRaw,
    decisionSpaceCapped: overrides.decisionSpaceCapped,
  });

  return trajectory.steps[0];
}

describe("executeActionStep", () => {
  it("records a step with correct actionId and legalActionCount", () => {
    const definition = createBaseDefinition();
    const noop = createNoopAction();
    definition.actions = [noop];
    const state = createInitialState(definition);
    const events = createEventStream();
    const trajectory = { steps: [], events };
    const context = { playerId: 1, phase: "main", turn: 1 };

    executeActionStep({
      definition,
      state,
      action: noop,
      context,
      legalActionCount: 3,
      rng: undefined,
      events,
      trajectory,
      stepControl: undefined,
    });

    assert.equal(trajectory.steps.length, 1);
    const step = trajectory.steps[0];
    assert.equal(step.actionId, "noop");
    assert.equal(step.legalActionCount, 3);
  });

  it("invokes onStep callback via stepControl", () => {
    const definition = createBaseDefinition();
    const noop = createNoopAction();
    definition.actions = [noop];
    const state = createInitialState(definition);
    const events = createEventStream();
    const trajectory = { steps: [], events };
    const context = { playerId: 1, phase: "main", turn: 1 };
    const recorded = [];

    executeActionStep({
      definition,
      state,
      action: noop,
      context,
      legalActionCount: 1,
      rng: undefined,
      events,
      trajectory,
      stepControl: { onStep: (s) => recorded.push(s) },
    });

    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].actionId, "noop");
  });

  it("includes a stateHash on the step", () => {
    const definition = createBaseDefinition();
    const noop = createNoopAction();
    definition.actions = [noop];
    const state = createInitialState(definition);
    const events = createEventStream();
    const trajectory = { steps: [], events };
    const context = { playerId: 1, phase: "main", turn: 1 };

    executeActionStep({
      definition,
      state,
      action: noop,
      context,
      legalActionCount: 1,
      rng: undefined,
      events,
      trajectory,
      stepControl: undefined,
    });

    assert.equal(typeof trajectory.steps[0].stateHash, "string");
    assert.ok(trajectory.steps[0].stateHash.length > 0);
  });

  it("records appliedEffects from action effects", () => {
    const definition = createBaseDefinition();
    const increment = createIncrementAction();
    definition.actions = [increment];
    const state = createInitialState(definition);
    const events = createEventStream();
    const trajectory = { steps: [], events };
    const context = { playerId: 1, phase: "main", turn: 1 };

    executeActionStep({
      definition,
      state,
      action: increment,
      context,
      legalActionCount: 1,
      rng: undefined,
      events,
      trajectory,
      stepControl: undefined,
    });

    assert.ok(Array.isArray(trajectory.steps[0].appliedEffects));
    assert.ok(trajectory.steps[0].appliedEffects.length > 0);
  });

  describe("costAborted trace field", () => {
    it("costAborted is true when action cost fails (bounds reject)", () => {
      const definition = createBaseDefinition();
      // Variable "counter" starts at 0 with min bound 0
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int", min: 0 }, initial: 0 },
      ];
      const costAction = {
        id: "costly",
        actor: "player",
        costs: [{ kind: "dec", target: { kind: "var", id: "counter" }, amount: 5 }],
        effects: [],
      };
      definition.actions = [costAction];

      const step = runStep({ definition, action: costAction });
      assert.equal(step.costAborted, true);
    });

    it("costAborted is absent when action succeeds (no cost failure)", () => {
      const step = runStep();
      assert.equal(Object.hasOwn(step, "costAborted"), false);
    });

    it("costAborted is absent when action has costs that succeed", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "gold", scope: "global", type: { kind: "int", min: 0 }, initial: 10 },
      ];
      const costAction = {
        id: "buy",
        actor: "player",
        costs: [{ kind: "dec", target: { kind: "var", id: "gold" }, amount: 3 }],
        effects: [],
      };
      definition.actions = [costAction];

      const step = runStep({ definition, action: costAction });
      assert.equal(Object.hasOwn(step, "costAborted"), false);
    });
  });

  describe("triggerAttemptCount and triggerSkipCount trace fields", () => {
    it("triggerAttemptCount is 0 and triggerSkipCount is 0 when no triggers defined", () => {
      const step = runStep();
      assert.equal(step.triggerAttemptCount, 0);
      assert.equal(step.triggerSkipCount, 0);
    });

    it("triggerAttemptCount counts after_action triggers from definition", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ];
      definition.triggers = [
        {
          event: "after_action",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
        {
          event: "after_action",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
      ];
      const increment = createIncrementAction();
      definition.actions = [increment];

      const step = runStep({ definition, action: increment });
      assert.equal(step.triggerAttemptCount, 2);
      assert.equal(step.triggerSkipCount, 0);
    });

    it("does not count triggers with non-after_action events", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ];
      definition.triggers = [
        {
          event: "after_action",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
        {
          event: "end_turn",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
      ];
      const increment = createIncrementAction();
      definition.actions = [increment];

      const step = runStep({ definition, action: increment });
      assert.equal(step.triggerAttemptCount, 1);
    });

    it("triggerSkipCount is 1 when a trigger fails (trigger-loop detection)", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ];
      // Trigger fires (no condition = always fires) but has empty effects,
      // producing no state change. The kernel detects this as "trigger-loop"
      // and returns ok: false, which applyAfterActionTriggers maps to skippedTrigger.
      definition.triggers = [
        {
          event: "after_action",
          effects: [],
        },
      ];
      const noop = createNoopAction();
      definition.actions = [noop];

      const step = runStep({ definition, action: noop });
      assert.equal(step.triggerAttemptCount, 1);
      assert.equal(step.triggerSkipCount, 1);
    });

    it("triggerAttemptCount >= triggerSkipCount invariant holds", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ];
      definition.triggers = [
        {
          event: "after_action",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
      ];
      const increment = createIncrementAction();
      definition.actions = [increment];

      const step = runStep({ definition, action: increment });
      assert.ok(
        step.triggerAttemptCount >= step.triggerSkipCount,
        `triggerAttemptCount (${step.triggerAttemptCount}) should be >= triggerSkipCount (${step.triggerSkipCount})`
      );
      assert.ok(step.triggerSkipCount >= 0);
    });

    it("includes stepEffects in triggerAttemptCount", () => {
      const definition = createBaseDefinition();
      definition.state.variables = [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ];
      definition.triggers = [];
      definition.turn.stepEffects = [
        {
          event: "after_action",
          effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
        },
      ];
      const increment = createIncrementAction();
      definition.actions = [increment];

      const step = runStep({ definition, action: increment });
      assert.equal(step.triggerAttemptCount, 1);
    });
  });

  describe("pass steps have no trace cost/trigger fields", () => {
    it("buildPassStep produces a step without costAborted or trigger counts", () => {
      const state = {
        turn: { turn: 1, phase: "main", currentPlayer: 1 },
        variables: {},
        tokens: [],
        zones: [],
      };
      const step = buildPassStep(state, "hash123");
      assert.equal(Object.hasOwn(step, "costAborted"), false);
      assert.equal(Object.hasOwn(step, "triggerAttemptCount"), false);
      assert.equal(Object.hasOwn(step, "triggerSkipCount"), false);
    });
  });

  describe("determinism", () => {
    it("produces identical trace fields for identical inputs", () => {
      const makeDefinition = () => {
        const def = createBaseDefinition();
        def.state.variables = [
          { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
        ];
        def.triggers = [
          {
            event: "after_action",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ];
        const action = createIncrementAction();
        def.actions = [action];
        return { definition: def, action };
      };

      const { definition: def1, action: act1 } = makeDefinition();
      const { definition: def2, action: act2 } = makeDefinition();

      const step1 = runStep({ definition: def1, action: act1 });
      const step2 = runStep({ definition: def2, action: act2 });

      assert.equal(step1.costAborted, step2.costAborted);
      assert.equal(step1.triggerAttemptCount, step2.triggerAttemptCount);
      assert.equal(step1.triggerSkipCount, step2.triggerSkipCount);
    });
  });
});
