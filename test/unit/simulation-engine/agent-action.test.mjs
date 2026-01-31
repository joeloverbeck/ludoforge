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

describe("resolveAgent", () => {
  it("returns undefined for empty agents array", () => {
    const state = {
      turn: { currentPlayer: 1 },
      agents: [{ id: 1 }],
    };
    const result = resolveAgent([], state);
    assert.equal(result, undefined);
  });
});

describe("selectAndValidateAction", () => {
  it("error includes currentPlayer and agentCount when agents empty", async () => {
    const action = { id: "noop", actor: "player", effects: [] };
    const definition = makeDefinition({ actions: [action] });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };

    await assert.rejects(
      () =>
        selectAndValidateAction({
          agents: [],
          definition,
          state,
          legalActions: [action],
          context,
        }),
      (err) => {
        assert.ok(err.message.includes("currentPlayer"));
        assert.ok(err.message.includes("agentCount"));
        return true;
      },
    );
  });

  it("error includes context when agent lacks selectAction", async () => {
    const action = { id: "noop", actor: "player", effects: [] };
    const definition = makeDefinition({ actions: [action] });
    const state = makeState();
    const context = { playerId: 1, phase: "main", turn: 1 };

    await assert.rejects(
      () =>
        selectAndValidateAction({
          agents: [{ id: 1 }],
          definition,
          state,
          legalActions: [action],
          context,
        }),
      (err) => {
        assert.ok(err.message.includes("currentPlayer"));
        assert.ok(err.message.includes("selectAction"));
        return true;
      },
    );
  });

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

    // With pre-filtering, the action should still be offered (effects are empty so bounds pass).
    // The arg-not-in-domain failure triggers retry, which exhausts remaining and returns null.
    const result = await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [action],
      context,
    });
    assert.equal(result, null);
  });

  it("returns null when all legal actions fail bounds", async () => {
    const boundsViolatingAction = {
      id: "overshoot",
      actor: "player",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 200 }],
    };
    const definition = makeDefinition({ actions: [boundsViolatingAction] });
    // Add variable with bounds so the action violates them
    definition.state.variables = [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ];
    const state = makeState();
    state.variables = { global: { score: 0 }, perPlayer: { 1: {}, 2: {} } };
    const context = { playerId: 1, phase: "main", turn: 1 };
    const agent = {
      selectAction() {
        return { actionId: "overshoot" };
      },
    };

    const result = await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [boundsViolatingAction],
      context,
    });
    assert.equal(result, null);
  });

  it("retries with remaining actions when agent picks bounds-failing action", async () => {
    const goodAction = {
      id: "safe",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    };
    const badAction = {
      id: "overshoot",
      actor: "player",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 200 }],
    };
    const definition = makeDefinition({ actions: [goodAction, badAction] });
    definition.state.variables = [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ];
    const state = makeState();
    state.variables = { global: { score: 0 }, perPlayer: { 1: {}, 2: {} } };
    const context = { playerId: 1, phase: "main", turn: 1 };

    // Pre-filtering removes "overshoot", so agent only sees "safe"
    let receivedActions;
    const agent = {
      selectAction(input) {
        receivedActions = input.legalActions.map((a) => a.id);
        return { actionId: "safe" };
      },
    };

    const result = await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [goodAction, badAction],
      context,
    });
    assert.notEqual(result, null);
    assert.equal(result.action.id, "safe");
    assert.ok(!receivedActions.includes("overshoot"), "agent should not see bounds-violating action");
    assert.ok(receivedActions.includes("safe"), "agent should see bounds-compliant action");
  });

  it("agent receives only bounds-compliant actions", async () => {
    const goodAction = {
      id: "heal",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    };
    const badAction = {
      id: "overshoot",
      actor: "player",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 9999 }],
    };
    const definition = makeDefinition({ actions: [goodAction, badAction] });
    definition.state.variables = [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 50 },
    ];
    const state = makeState();
    state.variables = { global: { score: 50 }, perPlayer: { 1: {}, 2: {} } };
    const context = { playerId: 1, phase: "main", turn: 1 };

    let agentReceivedIds;
    const agent = {
      selectAction(input) {
        agentReceivedIds = input.legalActions.map((a) => a.id);
        return { actionId: "heal" };
      },
    };

    await selectAndValidateAction({
      agents: [agent],
      definition,
      state,
      legalActions: [goodAction, badAction],
      context,
    });

    assert.deepEqual(agentReceivedIds, ["heal"]);
  });
});
