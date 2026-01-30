import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeActionStep } from "../../../src/simulation-engine/execute-action-step.js";
import {
  createInitialState,
  createEventStream,
} from "../../../src/game-kernel/index.js";
import {
  createBaseDefinition,
  createNoopAction,
  createIncrementAction,
} from "./fixtures.mjs";

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
});
