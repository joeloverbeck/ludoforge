import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appReducer, initialAppState } from "../../../src/tui/state/app-reducer.js";

describe("initialAppState", () => {
  it("has screen set to 'setup'", () => {
    assert.equal(initialAppState.screen, "setup");
  });

  it("has null definition and gameState", () => {
    assert.equal(initialAppState.definition, null);
    assert.equal(initialAppState.gameState, null);
  });

  it("has empty playerAssignments", () => {
    assert.deepStrictEqual(initialAppState.playerAssignments, []);
  });

  it("has empty legalActions and effectLog", () => {
    assert.deepStrictEqual(initialAppState.legalActions, []);
    assert.deepStrictEqual(initialAppState.effectLog, []);
  });

  it("has cursor indices at 0", () => {
    assert.equal(initialAppState.selectedActionIndex, 0);
    assert.equal(initialAppState.selectedTargetIndex, 0);
  });

  it("has null targetOptions and outcome", () => {
    assert.equal(initialAppState.targetOptions, null);
    assert.equal(initialAppState.outcome, null);
  });

  it("has watchSpeed 500 and isPaused false", () => {
    assert.equal(initialAppState.watchSpeed, 500);
    assert.equal(initialAppState.isPaused, false);
  });

  it("is frozen (immutable)", () => {
    assert.ok(Object.isFrozen(initialAppState));
  });
});

describe("appReducer", () => {
  it("SET_DEFINITION stores the definition", () => {
    const def = { version: "1.0" };
    const next = appReducer(initialAppState, { type: "SET_DEFINITION", definition: def });
    assert.equal(next.definition, def);
    assert.notEqual(next, initialAppState);
  });

  describe("INIT_PLAYER_ASSIGNMENTS", () => {
    it("creates assignments for the given count defaulting to random", () => {
      const next = appReducer(initialAppState, { type: "INIT_PLAYER_ASSIGNMENTS", count: 3 });
      assert.equal(next.playerAssignments.length, 3);
      assert.deepStrictEqual(next.playerAssignments[0], { playerId: 1, type: "random" });
      assert.deepStrictEqual(next.playerAssignments[1], { playerId: 2, type: "random" });
      assert.deepStrictEqual(next.playerAssignments[2], { playerId: 3, type: "random" });
    });

    it("replaces existing assignments", () => {
      const state = {
        ...initialAppState,
        playerAssignments: [{ playerId: 1, type: "human" }],
      };
      const next = appReducer(state, { type: "INIT_PLAYER_ASSIGNMENTS", count: 2 });
      assert.equal(next.playerAssignments.length, 2);
      assert.equal(next.playerAssignments[0].type, "random");
    });

    it("handles count of 1", () => {
      const next = appReducer(initialAppState, { type: "INIT_PLAYER_ASSIGNMENTS", count: 1 });
      assert.equal(next.playerAssignments.length, 1);
      assert.deepStrictEqual(next.playerAssignments[0], { playerId: 1, type: "random" });
    });

    it("does not mutate original state", () => {
      const next = appReducer(initialAppState, { type: "INIT_PLAYER_ASSIGNMENTS", count: 2 });
      assert.deepStrictEqual(initialAppState.playerAssignments, []);
      assert.equal(next.playerAssignments.length, 2);
    });
  });

  it("ASSIGN_PLAYER updates the correct player's type", () => {
    const state = {
      ...initialAppState,
      playerAssignments: [
        { playerId: 1, type: "human" },
        { playerId: 2, type: "random" },
      ],
    };
    const next = appReducer(state, { type: "ASSIGN_PLAYER", playerId: 2, playerType: "greedy" });
    assert.equal(next.playerAssignments[0].type, "human");
    assert.equal(next.playerAssignments[1].type, "greedy");
  });

  it("ASSIGN_PLAYER does not mutate the original array", () => {
    const state = {
      ...initialAppState,
      playerAssignments: [{ playerId: 1, type: "human" }],
    };
    const next = appReducer(state, { type: "ASSIGN_PLAYER", playerId: 1, playerType: "random" });
    assert.equal(state.playerAssignments[0].type, "human");
    assert.equal(next.playerAssignments[0].type, "random");
  });

  it("START_GAME sets screen to 'playing'", () => {
    const next = appReducer(initialAppState, { type: "START_GAME" });
    assert.equal(next.screen, "playing");
  });

  it("UPDATE_GAME_STATE stores the gameState", () => {
    const gs = { turn: 3 };
    const next = appReducer(initialAppState, { type: "UPDATE_GAME_STATE", gameState: gs });
    assert.equal(next.gameState, gs);
  });

  it("SET_LEGAL_ACTIONS resets action and target cursor state", () => {
    const state = {
      ...initialAppState,
      selectedActionIndex: 5,
      targetOptions: { action: {}, candidates: [] },
      selectedTargetIndex: 2,
    };
    const actions = [{ id: "a" }, { id: "b" }];
    const next = appReducer(state, { type: "SET_LEGAL_ACTIONS", legalActions: actions });
    assert.deepStrictEqual(next.legalActions, actions);
    assert.equal(next.selectedActionIndex, 0);
    assert.equal(next.targetOptions, null);
    assert.equal(next.selectedTargetIndex, 0);
  });

  describe("MOVE_CURSOR", () => {
    it("moves action cursor forward with wrapping", () => {
      const state = {
        ...initialAppState,
        legalActions: [{ id: "a" }, { id: "b" }, { id: "c" }],
        selectedActionIndex: 2,
      };
      const next = appReducer(state, { type: "MOVE_CURSOR", delta: 1 });
      assert.equal(next.selectedActionIndex, 0);
    });

    it("moves action cursor backward with wrapping", () => {
      const state = {
        ...initialAppState,
        legalActions: [{ id: "a" }, { id: "b" }],
        selectedActionIndex: 0,
      };
      const next = appReducer(state, { type: "MOVE_CURSOR", delta: -1 });
      assert.equal(next.selectedActionIndex, 1);
    });

    it("moves target cursor when targetOptions is set", () => {
      const state = {
        ...initialAppState,
        legalActions: [{ id: "a" }],
        selectedActionIndex: 0,
        targetOptions: { action: {}, candidates: ["c1", "c2", "c3"] },
        selectedTargetIndex: 1,
      };
      const next = appReducer(state, { type: "MOVE_CURSOR", delta: 1 });
      assert.equal(next.selectedTargetIndex, 2);
      assert.equal(next.selectedActionIndex, 0); // unchanged
    });

    it("returns same state when legalActions is empty", () => {
      const state = { ...initialAppState, legalActions: [] };
      const next = appReducer(state, { type: "MOVE_CURSOR", delta: 1 });
      assert.equal(next, state);
    });

    it("returns same state when target candidates is empty", () => {
      const state = {
        ...initialAppState,
        targetOptions: { action: {}, candidates: [] },
      };
      const next = appReducer(state, { type: "MOVE_CURSOR", delta: 1 });
      assert.equal(next, state);
    });
  });

  it("CONFIRM_ACTION sets targetOptions and resets target cursor", () => {
    const opts = { action: { id: "a" }, candidates: ["t1"] };
    const next = appReducer(initialAppState, { type: "CONFIRM_ACTION", targetOptions: opts });
    assert.deepStrictEqual(next.targetOptions, opts);
    assert.equal(next.selectedTargetIndex, 0);
  });

  it("CONFIRM_ACTION with no targetOptions sets null", () => {
    const next = appReducer(initialAppState, { type: "CONFIRM_ACTION" });
    assert.equal(next.targetOptions, null);
  });

  it("CONFIRM_TARGET clears target and action state", () => {
    const state = {
      ...initialAppState,
      targetOptions: { action: {}, candidates: ["t1"] },
      selectedTargetIndex: 1,
      legalActions: [{ id: "a" }],
      selectedActionIndex: 1,
    };
    const next = appReducer(state, { type: "CONFIRM_TARGET" });
    assert.equal(next.targetOptions, null);
    assert.equal(next.selectedTargetIndex, 0);
    assert.deepStrictEqual(next.legalActions, []);
    assert.equal(next.selectedActionIndex, 0);
  });

  it("CANCEL_TARGET clears targetOptions but keeps action state", () => {
    const state = {
      ...initialAppState,
      targetOptions: { action: {}, candidates: ["t1"] },
      selectedTargetIndex: 2,
      legalActions: [{ id: "a" }],
      selectedActionIndex: 1,
    };
    const next = appReducer(state, { type: "CANCEL_TARGET" });
    assert.equal(next.targetOptions, null);
    assert.equal(next.selectedTargetIndex, 0);
    assert.equal(next.selectedActionIndex, 1); // preserved
  });

  it("APPEND_LOG adds an entry", () => {
    const next = appReducer(initialAppState, {
      type: "APPEND_LOG",
      turn: 1,
      playerId: "P1",
      message: "spawn warrior in barracks",
    });
    assert.equal(next.effectLog.length, 1);
    assert.deepStrictEqual(next.effectLog[0], {
      turn: 1,
      playerId: "P1",
      message: "spawn warrior in barracks",
    });
  });

  it("APPEND_LOG does not mutate previous log", () => {
    const state = {
      ...initialAppState,
      effectLog: [{ turn: 1, playerId: "P1", message: "first" }],
    };
    const next = appReducer(state, {
      type: "APPEND_LOG",
      turn: 2,
      playerId: "P2",
      message: "second",
    });
    assert.equal(state.effectLog.length, 1);
    assert.equal(next.effectLog.length, 2);
  });

  it("SET_OUTCOME sets screen to gameover and stores outcome", () => {
    const outcome = { type: "win", players: [1] };
    const next = appReducer(initialAppState, { type: "SET_OUTCOME", outcome });
    assert.equal(next.screen, "gameover");
    assert.equal(next.outcome, outcome);
  });

  it("TOGGLE_PAUSE flips isPaused", () => {
    const next1 = appReducer(initialAppState, { type: "TOGGLE_PAUSE" });
    assert.equal(next1.isPaused, true);
    const next2 = appReducer(next1, { type: "TOGGLE_PAUSE" });
    assert.equal(next2.isPaused, false);
  });

  describe("ADJUST_SPEED", () => {
    it("increases speed by 100ms", () => {
      const next = appReducer(initialAppState, { type: "ADJUST_SPEED", delta: 1 });
      assert.equal(next.watchSpeed, 600);
    });

    it("decreases speed by 100ms", () => {
      const next = appReducer(initialAppState, { type: "ADJUST_SPEED", delta: -1 });
      assert.equal(next.watchSpeed, 400);
    });

    it("clamps at minimum 100ms", () => {
      const state = { ...initialAppState, watchSpeed: 100 };
      const next = appReducer(state, { type: "ADJUST_SPEED", delta: -1 });
      assert.equal(next.watchSpeed, 100);
    });

    it("clamps at maximum 2000ms", () => {
      const state = { ...initialAppState, watchSpeed: 2000 };
      const next = appReducer(state, { type: "ADJUST_SPEED", delta: 1 });
      assert.equal(next.watchSpeed, 2000);
    });
  });

  describe("RESTART_GAME", () => {
    it("resets screen to setup", () => {
      const state = {
        ...initialAppState,
        screen: "gameover",
        outcome: { outcomes: { 1: "win" } },
        gameState: { turn: { turn: 5 } },
        effectLog: [{ turn: 1, playerId: 1, message: "x" }],
      };
      const next = appReducer(state, { type: "RESTART_GAME" });
      assert.equal(next.screen, "setup");
    });

    it("preserves definition", () => {
      const def = { players: { count: 2 } };
      const state = {
        ...initialAppState,
        screen: "gameover",
        definition: def,
      };
      const next = appReducer(state, { type: "RESTART_GAME" });
      assert.equal(next.definition, def);
    });

    it("preserves playerAssignments as copies", () => {
      const assignments = [
        { playerId: 1, type: "human" },
        { playerId: 2, type: "greedy" },
      ];
      const state = {
        ...initialAppState,
        screen: "gameover",
        playerAssignments: assignments,
      };
      const next = appReducer(state, { type: "RESTART_GAME" });
      assert.equal(next.playerAssignments.length, 2);
      assert.deepStrictEqual(next.playerAssignments[0], { playerId: 1, type: "human" });
      assert.deepStrictEqual(next.playerAssignments[1], { playerId: 2, type: "greedy" });
      // Verify they are copies, not the same objects.
      assert.notEqual(next.playerAssignments[0], assignments[0]);
    });

    it("clears transient state (outcome, gameState, effectLog, legalActions)", () => {
      const state = {
        ...initialAppState,
        screen: "gameover",
        outcome: { outcomes: { 1: "win" } },
        gameState: { turn: { turn: 5 } },
        effectLog: [{ turn: 1, playerId: 1, message: "x" }],
        legalActions: [{ id: "a" }],
        selectedActionIndex: 3,
        isPaused: true,
      };
      const next = appReducer(state, { type: "RESTART_GAME" });
      assert.equal(next.outcome, null);
      assert.equal(next.gameState, null);
      assert.deepStrictEqual(next.effectLog, []);
      assert.deepStrictEqual(next.legalActions, []);
      assert.equal(next.selectedActionIndex, 0);
      assert.equal(next.isPaused, false);
    });

    it("resets watchSpeed to default", () => {
      const state = {
        ...initialAppState,
        screen: "gameover",
        watchSpeed: 1500,
      };
      const next = appReducer(state, { type: "RESTART_GAME" });
      assert.equal(next.watchSpeed, 500);
    });
  });

  it("returns same state for unknown action type", () => {
    const next = appReducer(initialAppState, { type: "UNKNOWN" });
    assert.equal(next, initialAppState);
  });
});
