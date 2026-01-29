import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDrawOutcome, buildTerminationOutcome, buildSimulationOutcome } from "../../../src/simulation-engine/termination-outcome.js";

function makeDefinition(playerCount = 2) {
  return {
    players: { count: playerCount },
    variables: [],
    scoring: [],
  };
}

function makeState() {
  return {
    variables: {},
    tokens: [],
    zones: [],
    turn: { currentPlayer: 1, phase: null, turn: 1 },
    agents: [],
  };
}

describe("buildDrawOutcome", () => {
  it("assigns draw to every player", () => {
    const result = buildDrawOutcome(makeDefinition(3));
    assert.deepEqual(result.outcomes, { 1: "draw", 2: "draw", 3: "draw" });
  });

  it("sets terminated to true", () => {
    const result = buildDrawOutcome(makeDefinition(2));
    assert.equal(result.terminated, true);
  });
});

describe("buildTerminationOutcome", () => {
  it("sets the terminated flag", () => {
    const result = buildTerminationOutcome(makeDefinition(), makeState(), undefined, 1, "test");
    assert.equal(result.terminated, true);
  });

  it("includes the reason field", () => {
    const result = buildTerminationOutcome(makeDefinition(), makeState(), undefined, 1, "my-reason");
    assert.equal(result.reason, "my-reason");
  });

  it("assigns win to active player and lose to others", () => {
    const outcomeDef = { type: "win", players: "active" };
    const result = buildTerminationOutcome(makeDefinition(2), makeState(), outcomeDef, 1, "test");
    assert.equal(result.outcomes[1], "win");
    assert.equal(result.outcomes[2], "lose");
  });

  it("assigns lose to specified players and win to others", () => {
    const outcomeDef = { type: "lose", players: "all" };
    const result = buildTerminationOutcome(makeDefinition(2), makeState(), outcomeDef, 1, "test");
    assert.equal(result.outcomes[1], "lose");
    assert.equal(result.outcomes[2], "lose");
  });

  it("defaults to draw for all when outcomeDef is null", () => {
    const result = buildTerminationOutcome(makeDefinition(2), makeState(), null, 1, "test");
    assert.equal(result.outcomes[1], "draw");
    assert.equal(result.outcomes[2], "draw");
  });

  it("defaults to draw for all when outcomeDef is undefined", () => {
    const result = buildTerminationOutcome(makeDefinition(2), makeState(), undefined, 1, "test");
    assert.equal(result.outcomes[1], "draw");
    assert.equal(result.outcomes[2], "draw");
  });

  it("includes scores", () => {
    const result = buildTerminationOutcome(makeDefinition(), makeState(), undefined, 1, "test");
    assert.ok("scores" in result);
  });
});

describe("buildSimulationOutcome", () => {
  it("extracts outcomes and scores", () => {
    const termination = { outcomes: { 1: "win" }, scores: { 1: 5 } };
    const result = buildSimulationOutcome(termination);
    assert.deepEqual(result, { outcomes: { 1: "win" }, scores: { 1: 5 } });
  });

  it("handles undefined input", () => {
    const result = buildSimulationOutcome(undefined);
    assert.equal(result.outcomes, undefined);
    assert.equal(result.scores, undefined);
  });
});
