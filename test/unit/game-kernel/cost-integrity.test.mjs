import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { listLegalActions, isActionLegal } from "../../../src/game-kernel/actions.js";

const costDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "gold", scope: "per_player", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [
    {
      id: "buy",
      actor: "player",
      costs: [
        { kind: "dec", target: { kind: "var", id: "gold" }, amount: 5 },
      ],
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    },
    {
      id: "free-action",
      actor: "player",
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    },
  ],
  turn: { scheduler: "round_robin" },
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
    ],
    maxTurns: 20,
  },
};

describe("cost integrity", () => {
  it("excludes action from listLegalActions when cost is infeasible (gold at min)", () => {
    const state = createInitialState(costDefinition);
    const context = { playerId: 1 };

    const legal = listLegalActions(costDefinition, state, context);
    const legalIds = legal.map((a) => a.id);

    assert.ok(!legalIds.includes("buy"), "buy should be illegal when gold=0");
    assert.ok(legalIds.includes("free-action"), "free-action should be legal");
  });

  it("includes action when cost is feasible", () => {
    const state = createInitialState(costDefinition);
    state.variables.perPlayer[1].gold = 10;
    const context = { playerId: 1 };

    const legal = listLegalActions(costDefinition, state, context);
    const legalIds = legal.map((a) => a.id);

    assert.ok(legalIds.includes("buy"), "buy should be legal when gold=10");
  });

  it("isActionLegal returns false for infeasible cost", () => {
    const state = createInitialState(costDefinition);
    const action = costDefinition.actions.find((a) => a.id === "buy");
    const context = { playerId: 1 };

    assert.equal(isActionLegal(costDefinition, state, action, context), false);
  });

  it("isActionLegal returns true for feasible cost", () => {
    const state = createInitialState(costDefinition);
    state.variables.perPlayer[1].gold = 10;
    const action = costDefinition.actions.find((a) => a.id === "buy");
    const context = { playerId: 1 };

    assert.equal(isActionLegal(costDefinition, state, action, context), true);
  });
});
