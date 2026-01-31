import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgents, buildOnStep } from "../../../src/tui/hooks/use-game-loop.js";

describe("buildAgents", () => {
  function makeOpts(overrides = {}) {
    return {
      playerAssignments: [{ playerId: 1, type: "random" }],
      dispatch: () => {},
      actionResolverRef: { current: null },
      legalMovesRef: { current: [] },
      getDelay: () => 0,
      getPaused: () => false,
      ...overrides,
    };
  }

  it("creates an agent for each player assignment", () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [
        { playerId: 1, type: "random" },
        { playerId: 2, type: "greedy" },
      ],
    }));
    assert.equal(agents.length, 2);
  });

  it("assigns correct id to AI agents", () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [
        { playerId: 1, type: "random" },
        { playerId: 2, type: "greedy" },
      ],
    }));
    assert.equal(agents[0].id, 1);
    assert.equal(agents[1].id, 2);
  });

  it("creates a human agent with selectAction function", () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "human" }],
    }));
    assert.equal(agents.length, 1);
    assert.equal(typeof agents[0].selectAction, "function");
    assert.equal(agents[0].id, 1);
  });

  it("human agent dispatches SET_LEGAL_ACTIONS on selectAction", () => {
    const dispatched = [];
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "human" }],
      dispatch: (action) => dispatched.push(action),
    }));
    const legalActions = [{ id: "move" }];
    agents[0].selectAction({ legalActions, legalMoves: [] });
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].type, "SET_LEGAL_ACTIONS");
    assert.deepStrictEqual(dispatched[0].legalActions, legalActions);
  });

  it("human agent stores legalMoves in legalMovesRef", () => {
    const legalMovesRef = { current: [] };
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "human" }],
      legalMovesRef,
    }));
    const moves = [{ action: { id: "x" }, domains: {} }];
    agents[0].selectAction({ legalActions: [], legalMoves: moves });
    assert.strictEqual(legalMovesRef.current, moves);
  });

  it("human agent selectAction returns a Promise", () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "human" }],
    }));
    const result = agents[0].selectAction({ legalActions: [] });
    assert.ok(result instanceof Promise);
  });

  it("human agent Promise resolves when actionResolverRef.current is called", async () => {
    const resolverRef = { current: null };
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "human" }],
      actionResolverRef: resolverRef,
    }));
    const promise = agents[0].selectAction({ legalActions: [] });
    assert.ok(resolverRef.current !== null, "resolver should be set");
    resolverRef.current({ actionId: "attack", args: {} });
    const resolved = await promise;
    assert.deepStrictEqual(resolved, { actionId: "attack", args: {} });
  });

  it("AI agent selectAction is async and returns a valid selection", async () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "random" }],
    }));
    // Simulate providing legalActions.
    const legalActions = [{ id: "move" }];
    const legalMoves = [{ action: { id: "move" }, domains: {} }];
    const result = await agents[0].selectAction({ legalActions, legalMoves });
    assert.equal(typeof result, "object");
    assert.ok("actionId" in result);
  });

  it("AI agent respects getPaused by waiting", async () => {
    let pauseCount = 0;
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "random" }],
      getPaused: () => {
        pauseCount += 1;
        return pauseCount < 3; // Paused for first 2 calls.
      },
      getDelay: () => 0,
    }));
    const legalActions = [{ id: "move" }];
    const legalMoves = [{ action: { id: "move" }, domains: {} }];
    const result = await agents[0].selectAction({ legalActions, legalMoves });
    assert.ok(pauseCount >= 3, "getPaused should have been called at least 3 times");
    assert.ok("actionId" in result);
  });

  it("defaults to random policy for unknown agent types", () => {
    const agents = buildAgents(makeOpts({
      playerAssignments: [{ playerId: 1, type: "something-unknown" }],
    }));
    assert.equal(agents.length, 1);
    assert.equal(typeof agents[0].selectAction, "function");
    assert.equal(agents[0].id, 1);
  });
});

describe("buildOnStep", () => {
  it("dispatches UPDATE_GAME_STATE when step has state", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    const fakeState = { turn: { currentPlayer: 1 } };
    onStep({ state: fakeState, turn: 1, playerId: 1, appliedEffects: [] });
    const updateAction = dispatched.find((a) => a.type === "UPDATE_GAME_STATE");
    assert.ok(updateAction);
    assert.strictEqual(updateAction.gameState, fakeState);
  });

  it("dispatches APPEND_LOG for every step", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({ turn: 2, playerId: 1, appliedEffects: [] });
    const logAction = dispatched.find((a) => a.type === "APPEND_LOG");
    assert.ok(logAction);
    assert.equal(logAction.turn, 2);
    assert.equal(logAction.playerId, 1);
  });

  it("formats applied effects into the log message", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({
      turn: 1,
      playerId: 1,
      actionId: "attack",
      appliedEffects: [{ kind: "inc", target: "score", amount: 3 }],
    });
    const logAction = dispatched.find((a) => a.type === "APPEND_LOG");
    assert.ok(logAction.message.includes("attack"));
    assert.ok(logAction.message.includes("score +3"));
  });

  it("uses 'pass' as default when no actionId", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({ turn: 1, playerId: 1, appliedEffects: [] });
    const logAction = dispatched.find((a) => a.type === "APPEND_LOG");
    assert.ok(logAction.message.includes("pass"));
  });

  it("does not dispatch UPDATE_GAME_STATE when step has no state", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({ turn: 1, playerId: 1, appliedEffects: [] });
    const updateAction = dispatched.find((a) => a.type === "UPDATE_GAME_STATE");
    assert.equal(updateAction, undefined);
  });

  it("handles step with multiple effects", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({
      turn: 1,
      playerId: 1,
      actionId: "cast",
      appliedEffects: [
        { kind: "inc", target: "mana", amount: 2 },
        { kind: "dec", target: "health", amount: 1 },
      ],
    });
    const logAction = dispatched.find((a) => a.type === "APPEND_LOG");
    assert.ok(logAction.message.includes("mana +2"));
    assert.ok(logAction.message.includes("health -1"));
  });

  it("defaults turn and playerId when missing", () => {
    const dispatched = [];
    const onStep = buildOnStep((action) => dispatched.push(action));
    onStep({ appliedEffects: [] });
    const logAction = dispatched.find((a) => a.type === "APPEND_LOG");
    assert.equal(logAction.turn, 0);
    assert.equal(logAction.playerId, "?");
  });
});
