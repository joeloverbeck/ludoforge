import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairTerminationOutcomes, repairImmediatelyTrueTerminations, repairTerminationThresholds } from "../../../src/evolutionary-engine/repair/termination-repair.js";

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

function makeDefinition(op, threshold, initial, min, max) {
  return {
    state: {
      variables: [
        { id: "score", type: { kind: "int", min, max }, initial },
      ],
    },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op,
            left: { kind: "ref", ref: { kind: "var", id: "score" } },
            right: { kind: "value", value: threshold },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
  };
}

function getThreshold(result) {
  return result.termination.conditions[0].condition.right.value;
}

describe("repairImmediatelyTrueTerminations", () => {
  it("repairs >= when initial >= threshold", () => {
    const def = makeDefinition(">=", 3, 5, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 6);
  });

  it("repairs <= when initial <= threshold", () => {
    const def = makeDefinition("<=", 7, 3, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 2);
  });

  it("repairs > when initial > threshold", () => {
    const def = makeDefinition(">", 2, 5, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 5);
  });

  it("repairs < when initial < threshold", () => {
    const def = makeDefinition("<", 8, 3, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 3);
  });

  it("repairs == when initial == threshold by shifting up", () => {
    const def = makeDefinition("==", 5, 5, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 6);
  });

  it("repairs == when initial == threshold at max by shifting down", () => {
    const def = makeDefinition("==", 10, 10, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(getThreshold(result), 9);
  });

  it("returns unchanged when condition is not immediately true", () => {
    const def = makeDefinition(">=", 8, 3, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result, def);
  });

  it("returns unchanged when no termination exists", () => {
    const def = { state: {} };
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result, def);
  });

  it("returns unchanged when conditions array is empty", () => {
    const def = { termination: { conditions: [] } };
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result, def);
  });

  it("skips non-cmp conditions", () => {
    const def = {
      state: { variables: [] },
      termination: {
        conditions: [
          { condition: { kind: "other" }, outcome: { type: "win", players: "active" } },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result, def);
  });

  it("removes unfixable == condition for single-value range (min == max == initial)", () => {
    const def = makeDefinition("==", 5, 5, 5, 5);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result.termination.conditions.length, 0);
  });

  it("removes unfixable >= condition when initial + 1 > max", () => {
    const def = makeDefinition(">=", 10, 10, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result.termination.conditions.length, 0);
  });

  it("removes unfixable <= condition when initial - 1 < min", () => {
    const def = makeDefinition("<=", 0, 0, 0, 10);
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result.termination.conditions.length, 0);
  });

  it("repairs only immediately-true conditions in mixed list", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "turns", type: { kind: "int", min: 0, max: 20 }, initial: 5 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 5 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: "<=",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    // score: initial=0 >= 5 is false, so unchanged
    assert.equal(result.termination.conditions[0].condition.right.value, 5);
    // turns: initial=5 <= 10 is true, so threshold adjusted to 5-1=4
    assert.equal(result.termination.conditions[1].condition.right.value, 4);
  });

  it("does not mutate the input definition", () => {
    const def = makeDefinition(">=", 3, 5, 0, 10);
    const original = structuredClone(def);
    repairImmediatelyTrueTerminations(def);
    assert.deepEqual(def, original);
  });

  it("removes unfixable >= from multi-condition list", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "turns", type: { kind: "int", min: 0, max: 10 }, initial: 10 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 5 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    // score: initial=0 >= 5 is false → kept
    // turns: initial=10 >= 10 is true, initial+1=11 > max=10 → removed
    assert.equal(result.termination.conditions.length, 1);
    assert.equal(result.termination.conditions[0].condition.left.ref.id, "score");
  });

  it("removes unfixable <= from multi-condition list", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
          { id: "turns", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 8 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: "<=",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 0 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    // score: initial=5 >= 8 is false → kept
    // turns: initial=0 <= 0 is true, initial-1=-1 < min=0 → removed
    assert.equal(result.termination.conditions.length, 1);
    assert.equal(result.termination.conditions[0].condition.left.ref.id, "score");
  });

  it("removes unfixable == from multi-condition list", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "turns", type: { kind: "int", min: 5, max: 5 }, initial: 5 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 5 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: "==",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 5 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    // score: initial=0 >= 5 is false → kept
    // turns: initial=5 == 5, min=5 max=5 → unfixable → removed
    assert.equal(result.termination.conditions.length, 1);
    assert.equal(result.termination.conditions[0].condition.left.ref.id, "score");
  });

  it("returns empty conditions when all are unfixable", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 10 },
          { id: "turns", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: "<=",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 0 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    assert.equal(result.termination.conditions.length, 0);
  });

  it("preserves non-immediately-true conditions alongside removal", () => {
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
          { id: "health", type: { kind: "int", min: 0, max: 20 }, initial: 5 },
          { id: "turns", type: { kind: "int", min: 0, max: 10 }, initial: 10 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 8 },
            },
            outcome: { type: "win", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: "<=",
              left: { kind: "ref", ref: { kind: "var", id: "health" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "lose", players: "active" },
          },
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "turns" } },
              right: { kind: "value", value: 10 },
            },
            outcome: { type: "draw", players: "all" },
          },
        ],
      },
    };
    const result = repairImmediatelyTrueTerminations(def);
    // score: initial=0 >= 8 is false → kept
    // health: initial=5 <= 10 is true, shift to 4 → kept (repaired)
    // turns: initial=10 >= 10 is true, 11 > max=10 → removed
    assert.equal(result.termination.conditions.length, 2);
    assert.equal(result.termination.conditions[0].condition.left.ref.id, "score");
    assert.equal(result.termination.conditions[1].condition.left.ref.id, "health");
    assert.equal(result.termination.conditions[1].condition.right.value, 4);
  });

  it("chain: repairTerminationThresholds clamps then repairImmediatelyTrueTerminations removes", () => {
    // threshold=15 exceeds max=10, initial=10 → clamp to 10 → >= 10 with initial=10 → unfixable
    const def = {
      state: {
        variables: [
          { id: "score", type: { kind: "int", min: 0, max: 10 }, initial: 10 },
        ],
      },
      termination: {
        conditions: [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 15 },
            },
            outcome: { type: "win", players: "active" },
          },
        ],
      },
    };
    const afterClamp = repairTerminationThresholds(def);
    assert.equal(afterClamp.termination.conditions[0].condition.right.value, 10);
    const afterImmediate = repairImmediatelyTrueTerminations(afterClamp);
    assert.equal(afterImmediate.termination.conditions.length, 0);
  });
});
