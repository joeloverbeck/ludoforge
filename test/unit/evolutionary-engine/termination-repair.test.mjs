import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairTerminationOutcomes } from "../../../src/evolutionary-engine/repair/termination-repair.js";

describe("repairTerminationOutcomes", () => {
  it("returns definition unchanged when players is 'active'", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "win", players: "active" } }],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.equal(result.termination.conditions[0].outcome.players, "active");
  });

  it("returns definition unchanged when players is 'all'", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "win", players: "all" } }],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.equal(result.termination.conditions[0].outcome.players, "all");
  });

  it("returns definition unchanged when players is an integer array", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "win", players: [0, 1] } }],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.deepEqual(result.termination.conditions[0].outcome.players, [0, 1]);
  });

  it("repairs 'inactive' to 'active'", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "win", players: "inactive" } }],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.equal(result.termination.conditions[0].outcome.players, "active");
  });

  it("repairs arbitrary invalid string to 'active'", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "lose", players: "nobody" } }],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.equal(result.termination.conditions[0].outcome.players, "active");
  });

  it("repairs only invalid entries, leaving valid ones untouched", () => {
    const definition = {
      termination: {
        conditions: [
          { condition: {}, outcome: { type: "win", players: "all" } },
          { condition: {}, outcome: { type: "lose", players: "inactive" } },
          { condition: {}, outcome: { type: "draw", players: [0] } },
        ],
        maxTurns: 20,
      },
    };
    const result = repairTerminationOutcomes(definition);
    assert.equal(result.termination.conditions[0].outcome.players, "all");
    assert.equal(result.termination.conditions[1].outcome.players, "active");
    assert.deepEqual(result.termination.conditions[2].outcome.players, [0]);
  });

  it("returns definition unchanged when no termination exists", () => {
    const definition = { state: {} };
    const result = repairTerminationOutcomes(definition);
    assert.deepEqual(result, definition);
  });

  it("returns definition unchanged when conditions array is empty", () => {
    const definition = { termination: { conditions: [], maxTurns: 10 } };
    const result = repairTerminationOutcomes(definition);
    assert.deepEqual(result, definition);
  });

  it("does not mutate the input definition", () => {
    const definition = {
      termination: {
        conditions: [{ condition: {}, outcome: { type: "win", players: "inactive" } }],
        maxTurns: 20,
      },
    };
    const original = structuredClone(definition);
    repairTerminationOutcomes(definition);
    assert.deepEqual(definition, original);
  });
});
