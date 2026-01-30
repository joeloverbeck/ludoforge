import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { advanceTurnPhase } from "../../../src/game-kernel/scheduler.js";

function makePriorityQueueDef(overrides = {}) {
  return {
    version: "1.0",
    players: { count: overrides.playerCount ?? 2 },
    state: {
      variables: [
        { id: "time", scope: "per_player", type: { kind: "int" }, initial: 0 },
        ...(overrides.extraVariables ?? []),
      ],
    },
    actions: [],
    turn: {
      scheduler: "priority_queue",
      orderBy: overrides.orderBy ?? { variable: "time", direction: "asc" },
      phases: overrides.phases ?? ["main"],
    },
    termination: { conditions: [], maxTurns: overrides.maxTurns ?? 50 },
    triggers: overrides.triggers ?? [],
  };
}

describe("priority_queue scheduler", () => {
  it("selects the player with the lowest variable value (asc)", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    // P1 time=0, P2 time=5 → P1 should act
    state.variables.perPlayer[2].time = 5;

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 1);
  });

  it("switches to other player after current player increments their variable", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    // P1 acts, then increments their time to 3
    // P2 time=0 → P2 should be next
    state.variables.perPlayer[1].time = 3;

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 2);
  });

  it("same player acts consecutively if their variable remains the minimum", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    // P1 time=0, P2 time=10
    state.variables.perPlayer[2].time = 10;

    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 1);

    // P1 increments to 2, still less than P2's 10
    state.variables.perPlayer[1].time = 2;
    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 1);

    // P1 increments to 5, still less than P2's 10
    state.variables.perPlayer[1].time = 5;
    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 1);
  });

  it("breaks ties by lowest player ID", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    // Both at time=0 → P1 wins tie
    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 1);
  });

  it("breaks ties by lowest player ID with 3 players", () => {
    const def = makePriorityQueueDef({ playerCount: 3 });
    const state = createInitialState(def);

    // All at time=0 → P1 wins tie
    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 1);

    // Set P1 to 5, P2 and P3 tied at 0 → P2 wins tie
    state.variables.perPlayer[1].time = 5;
    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 2);
  });

  it("desc direction: player with highest value acts next", () => {
    const def = makePriorityQueueDef({
      orderBy: { variable: "time", direction: "desc" },
    });
    const state = createInitialState(def);

    // P1 time=3, P2 time=7 → P2 should act (highest)
    state.variables.perPlayer[1].time = 3;
    state.variables.perPlayer[2].time = 7;

    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 2);
  });

  it("desc direction: tie-breaking still uses lowest player ID", () => {
    const def = makePriorityQueueDef({
      orderBy: { variable: "time", direction: "desc" },
    });
    const state = createInitialState(def);

    // Both at time=5 → P1 wins tie
    state.variables.perPlayer[1].time = 5;
    state.variables.perPlayer[2].time = 5;

    advanceTurnPhase(def, state);
    assert.equal(state.turn.currentPlayer, 1);
  });

  it("phase cycling works correctly within priority_queue turns", () => {
    const def = makePriorityQueueDef({ phases: ["setup", "main"] });
    const state = createInitialState(def);

    // P1 time=0, P2 time=5
    state.variables.perPlayer[2].time = 5;

    // First advance: setup → main (same player, same turn)
    advanceTurnPhase(def, state);
    assert.equal(state.turn.phase, "main");
    assert.equal(state.turn.currentPlayer, 1);

    // Second advance: main → setup of next turn, pick player by priority
    advanceTurnPhase(def, state);
    assert.equal(state.turn.phase, "setup");
    assert.equal(state.turn.currentPlayer, 1); // still lowest
  });

  it("round boundary fires when all players have acted", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    assert.equal(state.turn.round, 1);

    // P1 time=0, P2 time=5
    state.variables.perPlayer[2].time = 5;

    // Advance 1: finishes initial P1 turn, selects P1 again (still lowest)
    advanceTurnPhase(def, state);
    assert.equal(state.turn.round, 1);

    // Bump P1 so P2 is next
    state.variables.perPlayer[1].time = 10;

    // Advance 2: finishes P1 turn, selects P2 (time=5 < 10). acted={1}
    advanceTurnPhase(def, state);
    assert.equal(state.turn.round, 1); // P2 hasn't finished yet
    assert.equal(state.turn.currentPlayer, 2);

    // Advance 3: finishes P2 turn. acted={1,2} → round 2
    advanceTurnPhase(def, state);
    assert.equal(state.turn.round, 2);
  });

  it("round increments correctly over multiple rounds", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    // P1=0, P2=5
    state.variables.perPlayer[2].time = 5;

    // Advance 1: finish initial P1, select P1 (still lowest)
    advanceTurnPhase(def, state);
    state.variables.perPlayer[1].time = 10;

    // Advance 2: finish P1, select P2 (time=5 < 10). acted={1}
    advanceTurnPhase(def, state);

    // Advance 3: finish P2. acted={1,2} → round 2
    advanceTurnPhase(def, state);
    assert.equal(state.turn.round, 2);

    // Round 2: P2 selected (time=5 < 10)
    // Advance 4: finish P2. acted={2}
    state.variables.perPlayer[2].time = 15;

    // Advance 4: finish current turn, acted grows
    advanceTurnPhase(def, state);

    // Advance 5: finish next player. acted={2,1} → round 3
    advanceTurnPhase(def, state);
    assert.equal(state.turn.round, 3);
  });

  it("integration with start_round/end_round triggers", () => {
    const def = makePriorityQueueDef({
      extraVariables: [
        { id: "round_counter", scope: "global", type: { kind: "int" }, initial: 0 },
      ],
      triggers: [
        {
          event: "start_round",
          effects: [{ kind: "inc", target: { kind: "var", id: "round_counter" }, amount: 1 }],
        },
      ],
    });
    const state = createInitialState(def);

    // P1=0, P2=5
    state.variables.perPlayer[2].time = 5;

    // Advance 1: finish initial P1, select P1
    advanceTurnPhase(def, state);
    assert.equal(state.variables.global.round_counter, 0);

    state.variables.perPlayer[1].time = 10;

    // Advance 2: finish P1, select P2. acted={1}
    advanceTurnPhase(def, state);
    assert.equal(state.variables.global.round_counter, 0);

    // Advance 3: finish P2. acted={1,2} → round boundary → start_round fires
    advanceTurnPhase(def, state);
    assert.equal(state.variables.global.round_counter, 1);
  });

  it("advanceTurnPhase returns { ok: true } for valid priority_queue games", () => {
    const def = makePriorityQueueDef();
    const state = createInitialState(def);

    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
  });

  it("max-turns limit is respected", () => {
    const def = makePriorityQueueDef({ maxTurns: 2 });
    const state = createInitialState(def);

    const r1 = advanceTurnPhase(def, state);
    assert.equal(r1.ok, true);

    const r2 = advanceTurnPhase(def, state);
    assert.equal(r2.ok, false);
    assert.equal(r2.reason, "max-turns");
  });

  it("handles missing variable gracefully (defaults to 0)", () => {
    const def = makePriorityQueueDef({
      orderBy: { variable: "nonexistent", direction: "asc" },
    });
    const state = createInitialState(def);

    // All players default to 0 for missing variable → tie-break by ID
    const result = advanceTurnPhase(def, state);
    assert.equal(result.ok, true);
    assert.equal(state.turn.currentPlayer, 1);
  });
});
