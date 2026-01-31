import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { advanceAndCheck } from "../../../src/simulation-engine/turn-advance.js";
import { createInitialState, createEventStream } from "../../../src/game-kernel/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
} from "./fixtures.mjs";

function makeOpts(definition) {
  const state = createInitialState(definition);
  const events = createEventStream();
  const trajectory = { steps: [], events };
  return { state, events, trajectory };
}

describe("advanceAndCheck", () => {
  it("returns done:false on successful advance", () => {
    const definition = createBaseDefinition();
    definition.actions = [createIncrementAction()];
    const { state, events, trajectory } = makeOpts(definition);

    const result = advanceAndCheck(definition, state, {
      maxTurns: 100,
      events,
      trajectory,
    });

    assert.equal(result.done, false);
  });

  it("returns max-turns termination when maxTurns reached", () => {
    const definition = createBaseDefinition();
    definition.actions = [createIncrementAction()];
    const { state, events, trajectory } = makeOpts(definition);

    const result = advanceAndCheck(definition, state, {
      maxTurns: 1,
      events,
      trajectory,
    });

    assert.equal(result.done, true);
    assert.equal(result.result.terminationReason, "max-turns");
    assert.equal(result.result.terminated, false);
  });

  it("returns scheduler-error for unsupported scheduler", () => {
    const definition = createBaseDefinition();
    definition.turn.scheduler = "nonexistent";
    definition.actions = [createNoopAction()];
    const { state, events, trajectory } = makeOpts(definition);

    const result = advanceAndCheck(definition, state, {
      maxTurns: 100,
      events,
      trajectory,
    });

    assert.equal(result.done, true);
    assert.equal(result.result.terminationReason, "scheduler-error");
    assert.equal(result.result.terminated, false);
    assert.ok(result.result.outcome.outcomes);
    for (const val of Object.values(result.result.outcome.outcomes)) {
      assert.equal(val, "draw");
    }
  });

  it("scheduler-error maps bogus scheduler to scheduler-error reason", () => {
    const definition = createBaseDefinition();
    definition.turn.scheduler = "bogus_scheduler";
    definition.actions = [createNoopAction()];
    const { state, events, trajectory } = makeOpts(definition);

    const result = advanceAndCheck(definition, state, {
      maxTurns: 100,
      events,
      trajectory,
    });

    assert.equal(result.done, true);
    assert.equal(result.result.terminationReason, "scheduler-error");
    assert.equal(result.result.terminated, false);
    assert.ok(result.result.terminationDetail.includes("unsupported-scheduler"));
  });

  it("terminationDetail includes the raw reason string", () => {
    const definition = createBaseDefinition();
    definition.turn.scheduler = "unknown_thing";
    definition.actions = [createNoopAction()];
    const { state, events, trajectory } = makeOpts(definition);

    const result = advanceAndCheck(definition, state, {
      maxTurns: 100,
      events,
      trajectory,
    });

    assert.equal(result.done, true);
    assert.ok(
      result.result.terminationDetail.includes("unsupported-scheduler"),
      `Expected terminationDetail to include reason, got: ${result.result.terminationDetail}`
    );
  });

  it("records a termination event in the event stream", () => {
    const definition = createBaseDefinition();
    definition.turn.scheduler = "bogus";
    definition.actions = [createNoopAction()];
    const { state, events, trajectory } = makeOpts(definition);

    advanceAndCheck(definition, state, {
      maxTurns: 100,
      events,
      trajectory,
    });

    const terminationEvent = events.find((e) => e.type === "termination");
    assert.ok(terminationEvent, "Expected a termination event to be recorded");
  });
});
