import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLegalMoves, selectAndValidateAction, resolveAgent } from "../../../src/simulation-engine/agent-action.js";

function makeDefinition({ actions = [], params = false } = {}) {
  const def = {
    version: "1.0",
    players: { count: 2 },
    state: { variables: [] },
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: { conditions: [] },
    triggers: [],
    tokenTypes: params
      ? [{ id: "unit", attributes: [{ id: "hp", type: { kind: "int" }, initial: 10 }] }]
      : [],
    actions,
  };
  return def;
}

function makeState() {
  return {
    turn: { turn: 1, phase: "main", currentPlayer: 1 },
    agents: [{ id: 1 }, { id: 2 }],
    variables: {},
    tokens: {
      token_1: { type: "unit", attributes: { hp: 10 } },
      token_2: { type: "unit", attributes: { hp: 10 } },
      token_3: { type: "unit", attributes: { hp: 10 } },
    },
    zones: {
      board: { scope: "shared", tokens: ["token_1", "token_2", "token_3"] },
    },
  };
}

describe("buildLegalMoves", () => {
  it("returns empty domains for no-param actions", () => {
    const action = { id: "noop", effects: [] };
    const definition = makeDefinition({ actions: [action] });
    const state = makeState();
    const context = { playerId: 1 };

    const moves = buildLegalMoves(definition, state, [action], context);
    assert.equal(moves.length, 1);
    assert.equal(moves[0].action, action);
    assert.deepEqual(moves[0].domains, {});
  });

  it("resolves token param domains", () => {
    const action = {
      id: "attack",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [],
    };
    const definition = makeDefinition({ actions: [action], params: true });
    const state = makeState();
    const context = { playerId: 1 };

    const moves = buildLegalMoves(definition, state, [action], context);
    assert.equal(moves.length, 1);
    assert.ok(Array.isArray(moves[0].domains.t));
    assert.equal(moves[0].domains.t.length, 3);
    assert.ok(moves[0].domains.t.includes("token_1"));
    assert.ok(moves[0].domains.t.includes("token_2"));
    assert.ok(moves[0].domains.t.includes("token_3"));
  });

  it("resolves multiple actions with different params", () => {
    const attack = {
      id: "attack",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [],
    };
    const heal = { id: "heal", effects: [] };
    const definition = makeDefinition({ actions: [attack, heal], params: true });
    const state = makeState();
    const context = { playerId: 1 };

    const moves = buildLegalMoves(definition, state, [attack, heal], context);
    assert.equal(moves.length, 2);
    assert.equal(moves[0].domains.t.length, 3);
    assert.deepEqual(moves[1].domains, {});
  });
});

describe("selectAndValidateAction", () => {
  it("handles agent returning { actionId, args } format", async () => {
    const action = {
      id: "attack",
      actor: "player",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [],
    };
    const definition = makeDefinition({ actions: [action], params: true });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };
    const agent = {
      selectAction() {
        return { actionId: "attack", args: { t: "token_2" } };
      },
    };

    const result = await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [action],
      context,
    });

    assert.equal(result.action.id, "attack");
    assert.deepEqual(result.args, { t: "token_2" });
  });

  it("rejects agent returning a plain string", async () => {
    const action = { id: "noop", actor: "player", effects: [] };
    const definition = makeDefinition({ actions: [action] });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };
    const agent = {
      selectAction() {
        return "noop";
      },
    };

    await assert.rejects(
      () =>
        selectAndValidateAction({
          agents: [agent],
          definition,
          state,
          legalActions: [action],
          context,
        }),
      /Agent must return/,
    );
  });

  it("passes legalMoves to agent alongside legalActions", async () => {
    const action = {
      id: "attack",
      actor: "player",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [],
    };
    const definition = makeDefinition({ actions: [action], params: true });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };
    let receivedLegalMoves;
    let receivedLegalActions;
    const agent = {
      selectAction(input) {
        receivedLegalMoves = input.legalMoves;
        receivedLegalActions = input.legalActions;
        return { actionId: "attack", args: { t: "token_1" } };
      },
    };

    await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [action],
      context,
    });

    assert.ok(Array.isArray(receivedLegalMoves));
    assert.equal(receivedLegalMoves.length, 1);
    assert.ok(receivedLegalMoves[0].domains.t.length > 0);
    assert.ok(Array.isArray(receivedLegalActions));
    assert.equal(receivedLegalActions.length, 1);
  });

  it("rejects args with invalid token id", async () => {
    const action = {
      id: "attack",
      actor: "player",
      params: [
        { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
      ],
      effects: [],
    };
    const definition = makeDefinition({ actions: [action], params: true });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };
    const agent = {
      selectAction() {
        return { actionId: "attack", args: { t: "nonexistent_token" } };
      },
    };

    await assert.rejects(
      () =>
        selectAndValidateAction({
          agents: [agent],
          definition,
          state,
          legalActions: [action],
          context,
        }),
      /invalid action/i,
    );
  });
});
