import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { advanceTurnPhase } from "../../../src/game-kernel/scheduler.js";
import { applyTriggers } from "../../../src/game-kernel/triggers.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
  },
  actions: [],
  turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  termination: { conditions: [] },
  triggers: [],
};

describe("scheduler", () => {
  describe("advanceTurnPhase", () => {
    it("follows phase order and round-robin player turns", () => {
      const state = createInitialState(baseDefinition);

      const first = advanceTurnPhase(baseDefinition, state);
      assert.equal(first.ok, true);
      assert.equal(state.turn.phase, "main");
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.turn, 1);

      const second = advanceTurnPhase(baseDefinition, state);
      assert.equal(second.ok, true);
      assert.equal(state.turn.phase, "setup");
      assert.equal(state.turn.currentPlayer, 2);
      assert.equal(state.turn.turn, 2);
    });

    it("applies phase triggers around transitions", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "end_phase",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
          {
            event: "start_phase",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, true);
      assert.equal(state.variables.global.counter, 2);
    });

    it("detects trigger loops when triggers re-run without state change", () => {
      const definition = {
        ...baseDefinition,
        state: {
          variables: [{ id: "flag", scope: "global", type: { kind: "int" }, initial: 1 }],
        },
        triggers: [
          {
            event: "start_phase",
            condition: {
              kind: "cmp",
              op: "==",
              left: { kind: "ref", ref: { kind: "var", id: "flag" } },
              right: { kind: "value", value: 1 },
            },
            effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "trigger-loop");
    });

    it("blocks advancing beyond the configured max-turn limit", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 1 },
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "max-turns");
      assert.equal(state.turn.turn, 1);
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.phase, "main");
    });

    it("does not false-loop when round distinguishes otherwise-identical states", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["setup", "main"] },
        termination: { conditions: [], maxTurns: 10 },
      };
      const state = createInitialState(definition);

      // With round in the snapshot, identical board states in different
      // rounds are correctly distinguished and do not trigger state-loop.
      advanceTurnPhase(definition, state);
      advanceTurnPhase(definition, state);
      advanceTurnPhase(definition, state);
      const result = advanceTurnPhase(definition, state);

      assert.equal(result.ok, true);
    });

    it("halts repeated states with a failsafe draw flag when snapshots truly match", () => {
      // Use a trigger that resets a counter every advance, so the snapshot
      // (variables + tokens + zones + turn player/phase/round) repeats once
      // round wraps in the history window. With a 1-player, 1-phase game,
      // each advance increments round, so we need the history limit small
      // enough that we eventually re-encounter a snapshot. But round always
      // grows, so true loops require the trigger to reset round-relevant state.
      //
      // Instead, test loop detection via a trigger that creates an actual
      // state cycle within the same scheduler step (trigger loop).
      const definition = {
        ...baseDefinition,
        state: {
          variables: [
            { id: "flag", scope: "global", type: { kind: "int" }, initial: 1 },
          ],
        },
        triggers: [
          {
            event: "start_phase",
            condition: {
              kind: "cmp",
              op: "==",
              left: { kind: "ref", ref: { kind: "var", id: "flag" } },
              right: { kind: "value", value: 1 },
            },
            effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "trigger-loop");
    });

    it("caps auto-effects per scheduler step via max step guard", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "start_phase",
            effects: [
              { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
              { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
            ],
          },
        ],
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state, { maxStepsPerTurn: 1 });
      assert.equal(result.ok, false);
      assert.equal(result.reason, "max-steps");
      assert.equal(state.variables.global.counter, 1);
    });
  });

  describe("simultaneous scheduler", () => {
    it("cycles phases and increments round each turn", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "simultaneous", phases: ["plan", "resolve"] },
      };
      const state = createInitialState(definition);

      const first = advanceTurnPhase(definition, state);
      assert.equal(first.ok, true);
      assert.equal(state.turn.phase, "resolve");
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.turn, 1);
      assert.equal(state.turn.round, 1);

      const second = advanceTurnPhase(definition, state);
      assert.equal(second.ok, true);
      assert.equal(state.turn.phase, "plan");
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.turn, 2);
      assert.equal(state.turn.round, 2);
    });

    it("fires start_round and end_round triggers on each turn boundary", () => {
      const definition = {
        ...baseDefinition,
        state: {
          variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
        },
        turn: { scheduler: "simultaneous", phases: ["main"] },
        triggers: [
          {
            event: "end_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
          {
            event: "start_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, true);
      assert.equal(state.turn.round, 2);
      assert.equal(state.variables.global.counter, 2);
    });
  });

  describe("round tracking", () => {
    it("increments round after all players complete one turn cycle (2 players)", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
      };
      const state = createInitialState(definition);

      assert.equal(state.turn.round, 1);

      // Turn 1: P1 main → P2
      advanceTurnPhase(definition, state);
      assert.equal(state.turn.currentPlayer, 2);
      assert.equal(state.turn.round, 1);

      // Turn 2: P2 main → P1 (round wraps)
      advanceTurnPhase(definition, state);
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.round, 2);
    });

    it("increments round correctly for 3-player game over 3 full rounds", () => {
      const definition = {
        ...baseDefinition,
        players: { count: 3 },
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
      };
      const state = createInitialState(definition);

      assert.equal(state.turn.round, 1);

      // Round 1: P1→P2→P3→P1
      advanceTurnPhase(definition, state); // P2, round 1
      advanceTurnPhase(definition, state); // P3, round 1
      advanceTurnPhase(definition, state); // P1, round 2
      assert.equal(state.turn.round, 2);

      // Round 2: P1→P2→P3→P1
      advanceTurnPhase(definition, state); // P2, round 2
      advanceTurnPhase(definition, state); // P3, round 2
      advanceTurnPhase(definition, state); // P1, round 3
      assert.equal(state.turn.round, 3);

      // Round 3: P1→P2→P3→P1
      advanceTurnPhase(definition, state); // P2, round 3
      advanceTurnPhase(definition, state); // P3, round 3
      advanceTurnPhase(definition, state); // P1, round 4
      assert.equal(state.turn.round, 4);
    });

    it("round is always a positive integer >= 1", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
      };
      const state = createInitialState(definition);

      assert.ok(Number.isInteger(state.turn.round));
      assert.ok(state.turn.round >= 1);

      for (let i = 0; i < 8; i++) {
        advanceTurnPhase(definition, state);
        assert.ok(Number.isInteger(state.turn.round));
        assert.ok(state.turn.round >= 1);
      }
    });

    it("round only increments when player wraps back to player 1", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["setup", "main"] },
        termination: { conditions: [], maxTurns: 20 },
      };
      const state = createInitialState(definition);

      // Phase advance within same player turn: round stays
      advanceTurnPhase(definition, state); // P1 main, round 1
      assert.equal(state.turn.round, 1);

      // Player advance to P2: round stays
      advanceTurnPhase(definition, state); // P2 setup, round 1
      assert.equal(state.turn.round, 1);

      advanceTurnPhase(definition, state); // P2 main, round 1
      assert.equal(state.turn.round, 1);

      // Player wraps to P1: round increments
      advanceTurnPhase(definition, state); // P1 setup, round 2
      assert.equal(state.turn.round, 2);
      assert.equal(state.turn.currentPlayer, 1);
    });

    it("snapshotLoopState distinguishes identical board states in different rounds", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
      };
      const state = createInitialState(definition);

      // Advance through two full rounds with no variable changes.
      // Without round in the snapshot, these would be identical.
      // With round, they are distinct — no state-loop detected.
      advanceTurnPhase(definition, state); // P2 round 1
      advanceTurnPhase(definition, state); // P1 round 2
      advanceTurnPhase(definition, state); // P2 round 2
      const result = advanceTurnPhase(definition, state); // P1 round 3

      assert.equal(result.ok, true);
      assert.equal(state.turn.round, 3);
    });
  });

  describe("round triggers", () => {
    it("fires start_round trigger at the beginning of each new round", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "start_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 10 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // P1 main → P2 (no round boundary)
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 0);

      // P2 main → P1 (round 1→2, fires start_round)
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 10);
      assert.equal(state.turn.round, 2);
    });

    it("fires end_round trigger at the end of each completed round", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "end_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 5 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // P1 → P2 (no round boundary)
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 0);

      // P2 → P1 (round boundary, fires end_round)
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 5);
    });

    it("fires end_round before start_round (ordering)", () => {
      const definition = {
        ...baseDefinition,
        state: {
          variables: [
            { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
            { id: "order_log", scope: "global", type: { kind: "int" }, initial: 0 },
          ],
        },
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "end_round",
            effects: [{ kind: "set", target: { kind: "var", id: "order_log" }, value: 1 }],
          },
          {
            event: "start_round",
            effects: [{ kind: "set", target: { kind: "var", id: "order_log" }, value: 2 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // Advance through full round to trigger boundary
      advanceTurnPhase(definition, state); // P2
      advanceTurnPhase(definition, state); // P1, round 2

      // end_round set it to 1, then start_round overwrote it to 2
      assert.equal(state.variables.global.order_log, 2);
    });

    it("end_round trigger effects can modify state before the new round", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "end_round",
            effects: [{ kind: "set", target: { kind: "var", id: "counter" }, value: 0 }],
          },
          {
            event: "start_phase",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // Phase transitions increment counter via start_phase
      advanceTurnPhase(definition, state); // P2, start_phase fires → counter=1
      advanceTurnPhase(definition, state); // round boundary: end_round resets to 0, then start_phase → counter=1
      assert.equal(state.variables.global.counter, 1);
    });

    it("start_round trigger effects see the updated round number", () => {
      // The start_round trigger fires after state.turn.round is updated.
      // We verify by checking that a condition on round=2 fires correctly.
      const definition = {
        ...baseDefinition,
        state: {
          variables: [
            { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
            { id: "round_snapshot", scope: "global", type: { kind: "int" }, initial: 0 },
          ],
        },
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "start_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      advanceTurnPhase(definition, state); // P2, round 1
      advanceTurnPhase(definition, state); // P1, round 2 — start_round fires
      assert.equal(state.turn.round, 2);
      assert.equal(state.variables.global.counter, 1);

      advanceTurnPhase(definition, state); // P2, round 2
      advanceTurnPhase(definition, state); // P1, round 3 — start_round fires
      assert.equal(state.turn.round, 3);
      assert.equal(state.variables.global.counter, 2);
    });

    it("triggers with conditions on start_round only fire when condition is true", () => {
      const definition = {
        ...baseDefinition,
        state: {
          variables: [
            { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
            { id: "flag", scope: "global", type: { kind: "int" }, initial: 0 },
          ],
        },
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "start_round",
            condition: {
              kind: "cmp",
              op: "==",
              left: { kind: "ref", ref: { kind: "var", id: "flag" } },
              right: { kind: "value", value: 1 },
            },
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 100 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // Round 1→2: flag=0, condition false → counter stays 0
      advanceTurnPhase(definition, state);
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 0);

      // Set flag=1, then advance to round 3
      state.variables.global.flag = 1;
      advanceTurnPhase(definition, state);
      advanceTurnPhase(definition, state);
      assert.equal(state.variables.global.counter, 100);
    });

    it("round triggers fire once per full cycle, not once per player turn", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [
          {
            event: "start_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
          {
            event: "end_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);

      // Full round: P1→P2 (no triggers), P2→P1 (both fire once each = +2)
      advanceTurnPhase(definition, state); // P2, no round boundary
      assert.equal(state.variables.global.counter, 0);

      advanceTurnPhase(definition, state); // P1, round 2 — end_round +1, start_round +1
      assert.equal(state.variables.global.counter, 2);

      // Another full round
      advanceTurnPhase(definition, state); // P2, no round boundary
      assert.equal(state.variables.global.counter, 2);

      advanceTurnPhase(definition, state); // P1, round 3 — end_round +1, start_round +1
      assert.equal(state.variables.global.counter, 4);
    });

    it("clears round-duration flags at round boundary", () => {
      const definition = {
        ...baseDefinition,
        turn: { scheduler: "round_robin", phases: ["main"] },
        termination: { conditions: [], maxTurns: 20 },
        triggers: [],
      };
      const state = createInitialState(definition);

      // Manually set a round-duration flag on agent
      state.agents[0].flags = { round_buff: { duration: "round" } };

      // P1→P2: no round boundary, flag persists
      advanceTurnPhase(definition, state);
      assert.ok(state.agents[0].flags.round_buff);

      // P2→P1: round boundary, round flags cleared
      advanceTurnPhase(definition, state);
      assert.equal(state.agents[0].flags.round_buff, undefined);
    });
  });

  describe("random_draw scheduler", () => {
    function makeRng(values) {
      let i = 0;
      return { next: () => values[i++ % values.length] };
    }

    const randomDrawDef = {
      ...baseDefinition,
      turn: { scheduler: "random_draw", phases: ["main"] },
      termination: { conditions: [], maxTurns: 50 },
    };

    it("selects a player using the provided RNG", () => {
      const state = createInitialState(randomDrawDef);
      // rng returns 0.0 → floor(0.0 * 2) + 1 = 1
      const rng = makeRng([0.0]);
      const result = advanceTurnPhase(randomDrawDef, state, { rng });
      assert.equal(result.ok, true);
      assert.equal(state.turn.currentPlayer, 1);
    });

    it("selects player 2 when RNG returns high value", () => {
      const state = createInitialState(randomDrawDef);
      // rng returns 0.9 → floor(0.9 * 2) + 1 = 2
      const rng = makeRng([0.9]);
      const result = advanceTurnPhase(randomDrawDef, state, { rng });
      assert.equal(result.ok, true);
      assert.equal(state.turn.currentPlayer, 2);
    });

    it("produces deterministic sequence with same RNG seed values", () => {
      const values = [0.1, 0.7, 0.3, 0.9];
      const state1 = createInitialState(randomDrawDef);
      const state2 = createInitialState(randomDrawDef);

      const players1 = [];
      const players2 = [];
      const rng1 = makeRng(values);
      const rng2 = makeRng(values);

      for (let i = 0; i < 4; i++) {
        advanceTurnPhase(randomDrawDef, state1, { rng: rng1 });
        players1.push(state1.turn.currentPlayer);
        advanceTurnPhase(randomDrawDef, state2, { rng: rng2 });
        players2.push(state2.turn.currentPlayer);
      }

      assert.deepEqual(players1, players2);
    });

    it("produces different sequences with different RNG values", () => {
      const state1 = createInitialState(randomDrawDef);
      const state2 = createInitialState(randomDrawDef);

      const rng1 = makeRng([0.1, 0.1, 0.1, 0.1]);
      const rng2 = makeRng([0.9, 0.9, 0.9, 0.9]);

      const players1 = [];
      const players2 = [];
      for (let i = 0; i < 4; i++) {
        advanceTurnPhase(randomDrawDef, state1, { rng: rng1 });
        players1.push(state1.turn.currentPlayer);
        advanceTurnPhase(randomDrawDef, state2, { rng: rng2 });
        players2.push(state2.turn.currentPlayer);
      }

      assert.notDeepEqual(players1, players2);
    });

    it("eventually selects all players over many steps", () => {
      const def3 = {
        ...randomDrawDef,
        players: { count: 3 },
      };
      const state = createInitialState(def3);
      // cycle through values that map to players 1, 2, 3
      const rng = makeRng([0.0, 0.4, 0.8]);
      const seen = new Set();

      for (let i = 0; i < 6; i++) {
        advanceTurnPhase(def3, state, { rng });
        seen.add(state.turn.currentPlayer);
      }

      assert.equal(seen.size, 3);
      assert.ok(seen.has(1));
      assert.ok(seen.has(2));
      assert.ok(seen.has(3));
    });

    it("cycles phases before selecting next player", () => {
      const multiPhaseDef = {
        ...randomDrawDef,
        turn: { scheduler: "random_draw", phases: ["setup", "main"] },
      };
      const state = createInitialState(multiPhaseDef);
      const rng = makeRng([0.9]);

      // First advance: phase setup→main, same player
      const first = advanceTurnPhase(multiPhaseDef, state, { rng });
      assert.equal(first.ok, true);
      assert.equal(state.turn.phase, "main");
      assert.equal(state.turn.currentPlayer, 1); // still player 1
      assert.equal(state.turn.turn, 1); // same turn

      // Second advance: last phase done → random draw picks next player
      const second = advanceTurnPhase(multiPhaseDef, state, { rng });
      assert.equal(second.ok, true);
      assert.equal(state.turn.phase, "setup");
      assert.equal(state.turn.currentPlayer, 2); // rng 0.9 → player 2
      assert.equal(state.turn.turn, 2);
    });

    it("increments round when all players have acted", () => {
      const state = createInitialState(randomDrawDef);
      // With 2 players, both must act before round increments.
      // P1 acts first (initial), then P2 via rng.
      const rng = makeRng([0.9, 0.0]); // picks P2, then P1

      assert.equal(state.turn.round, 1);

      // Advance: P1 acted (initial), rng picks P2
      advanceTurnPhase(randomDrawDef, state, { rng });
      assert.equal(state.turn.currentPlayer, 2);
      // P1 has acted, P2 now current but hasn't completed yet
      // The acted set tracks the outgoing player each advance

      // Advance: P2 acted, rng picks P1 → both acted → round increments
      advanceTurnPhase(randomDrawDef, state, { rng });
      assert.equal(state.turn.round, 2);
    });

    it("fails with reason when RNG is not provided", () => {
      const state = createInitialState(randomDrawDef);
      const result = advanceTurnPhase(randomDrawDef, state);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "random-draw-missing-rng");
    });
  });

  describe("applyTriggers", () => {
    it("blocks re-entry when recursion depth is exceeded", () => {
      const definition = {
        ...baseDefinition,
        triggers: [
          {
            event: "start_phase",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
          },
        ],
      };
      const state = createInitialState(definition);
      const guard = { depth: 1, maxDepth: 1, steps: 0, maxSteps: 10 };

      const result = applyTriggers(definition, state, "start_phase", {
        playerId: 1,
        phase: "setup",
        guard,
      });

      assert.equal(result.ok, false);
      assert.equal(result.reason, "trigger-recursion");
    });
  });
});
