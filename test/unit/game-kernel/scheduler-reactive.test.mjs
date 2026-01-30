import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { advanceTurnPhase } from "../../../src/game-kernel/scheduler.js";
import {
  findEligibleReactivePlayers,
  advanceReactive,
} from "../../../src/game-kernel/scheduler-strategies.js";

function makeReactiveDefinition(overrides = {}) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "timer", scope: "per_player", type: { kind: "int", min: 0 }, initial: 3 },
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "ready", scope: "per_player", type: { kind: "int" }, initial: 0 },
      ],
      ...(overrides.state ?? {}),
    },
    actions: [],
    turn: {
      scheduler: "reactive",
      phases: ["main"],
      stepEffects: [
        {
          event: "end_phase",
          condition: {
            kind: "cmp",
            op: "==",
            left: { kind: "ref", ref: { kind: "var", id: "timer" } },
            right: { kind: "value", value: 0 },
          },
          effects: [{ kind: "set", target: { kind: "var", id: "ready" }, value: 1 }],
        },
      ],
      ...(overrides.turn ?? {}),
    },
    termination: { conditions: [], maxTurns: 50 },
    triggers: overrides.triggers ?? [],
  };
}

describe("reactive scheduler", () => {
  describe("findEligibleReactivePlayers", () => {
    it("returns players whose condition is met", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      // Set player 1 timer to 0 (condition met)
      state.variables.perPlayer[1].timer = 0;
      // Player 2 timer stays at 3 (condition not met)

      const eligible = findEligibleReactivePlayers(definition, state);
      assert.deepEqual(eligible, [1]);
    });

    it("returns multiple eligible players sorted by player ID", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      // Both players meet condition
      state.variables.perPlayer[1].timer = 0;
      state.variables.perPlayer[2].timer = 0;

      const eligible = findEligibleReactivePlayers(definition, state);
      assert.deepEqual(eligible, [1, 2]);
    });

    it("returns empty array when no player meets condition", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      // Neither player has timer == 0

      const eligible = findEligibleReactivePlayers(definition, state);
      assert.deepEqual(eligible, []);
    });

    it("returns empty array when no stepEffects have conditions", () => {
      const definition = makeReactiveDefinition({
        turn: {
          scheduler: "reactive",
          phases: ["main"],
          stepEffects: [
            {
              event: "end_phase",
              effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const eligible = findEligibleReactivePlayers(definition, state);
      assert.deepEqual(eligible, []);
    });

    it("returns empty array when stepEffects is missing", () => {
      const definition = makeReactiveDefinition({
        turn: { scheduler: "reactive", phases: ["main"] },
      });
      const state = createInitialState(definition);

      const eligible = findEligibleReactivePlayers(definition, state);
      assert.deepEqual(eligible, []);
    });
  });

  describe("advanceReactive", () => {
    it("selects first eligible player by ID", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      state.variables.perPlayer[2].timer = 0;

      const result = advanceReactive(definition, state);
      assert.equal(result.nextPlayer, 2);
      assert.equal(result._noEligible, false);
    });

    it("prefers lowest player ID when multiple are eligible", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      state.variables.perPlayer[1].timer = 0;
      state.variables.perPlayer[2].timer = 0;

      const result = advanceReactive(definition, state);
      assert.equal(result.nextPlayer, 1);
    });

    it("falls back to player 1 when no one is eligible", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);

      const result = advanceReactive(definition, state);
      assert.equal(result.nextPlayer, 1);
      assert.equal(result._noEligible, true);
    });

    it("cycles phases before selecting next player", () => {
      const definition = makeReactiveDefinition({
        turn: {
          scheduler: "reactive",
          phases: ["setup", "main"],
          stepEffects: [
            {
              event: "end_phase",
              condition: {
                kind: "cmp",
                op: "==",
                left: { kind: "ref", ref: { kind: "var", id: "timer" } },
                right: { kind: "value", value: 0 },
              },
              effects: [],
            },
          ],
        },
      });
      const state = createInitialState(definition);
      state.variables.perPlayer[2].timer = 0;

      // First advance: setup → main (phase cycling, same player)
      const first = advanceReactive(definition, state);
      assert.equal(first.nextPhase, "main");
      assert.equal(first.nextPlayer, 1); // still same player during phase cycling
      assert.equal(first.nextTurn, 1); // same turn

      // Simulate applying the first result
      state.turn = {
        currentPlayer: first.nextPlayer,
        phase: first.nextPhase,
        turn: first.nextTurn,
        round: first.nextRound,
        _actedThisRound: first._actedThisRound,
      };

      // Second advance: last phase done → reactive selects eligible player
      const second = advanceReactive(definition, state);
      assert.equal(second.nextPhase, "setup");
      assert.equal(second.nextPlayer, 2); // eligible player
      assert.equal(second.nextTurn, 2);
    });

    it("increments turn on each advance past last phase", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      state.variables.perPlayer[1].timer = 0;

      const result = advanceReactive(definition, state);
      assert.equal(result.nextTurn, state.turn.turn + 1);
    });
  });

  describe("advanceTurnPhase with reactive scheduler", () => {
    it("accepts reactive as a valid scheduler", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      state.variables.perPlayer[1].timer = 0;

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, true);
    });

    it("selects eligible player through full advanceTurnPhase flow", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      state.variables.perPlayer[2].timer = 0;

      const result = advanceTurnPhase(definition, state);
      assert.equal(result.ok, true);
      assert.equal(state.turn.currentPlayer, 2);
    });

    it("tracks rounds correctly with reactive scheduler", () => {
      const definition = makeReactiveDefinition();
      const state = createInitialState(definition);
      // Only P2 eligible first, then P1 eligible — forces both to act
      state.variables.perPlayer[2].timer = 0;

      assert.equal(state.turn.round, 1);

      // Advance 1: P2 acts (only eligible player)
      advanceTurnPhase(definition, state);
      assert.equal(state.turn.currentPlayer, 2);
      assert.equal(state.turn.round, 1);

      // Now make P1 eligible too
      state.variables.perPlayer[1].timer = 0;

      // Advance 2: Both eligible, P1 selected (lowest ID).
      // P2 already acted + P1 now acts → both acted → round increments
      advanceTurnPhase(definition, state);
      assert.equal(state.turn.currentPlayer, 1);
      assert.equal(state.turn.round, 2);
    });

    it("fires round triggers at round boundary", () => {
      const definition = makeReactiveDefinition({
        triggers: [
          {
            event: "start_round",
            effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 10 }],
          },
        ],
      });
      const state = createInitialState(definition);
      // P2 eligible first, then P1 — forces round advancement
      state.variables.perPlayer[2].timer = 0;

      advanceTurnPhase(definition, state); // P2 acts
      state.variables.perPlayer[1].timer = 0;
      advanceTurnPhase(definition, state); // P1 acts → both acted → round 2

      assert.equal(state.turn.round, 2);
      assert.equal(state.variables.global.counter, 10);
    });

    it("applies step effects (end_phase triggers) when no player is eligible", () => {
      // stepEffects with an unconditioned end_phase trigger that decrements timers
      const definition = makeReactiveDefinition({
        turn: {
          scheduler: "reactive",
          phases: ["main"],
          stepEffects: [
            {
              event: "end_phase",
              condition: {
                kind: "cmp",
                op: "==",
                left: { kind: "ref", ref: { kind: "var", id: "timer" } },
                right: { kind: "value", value: 0 },
              },
              effects: [],
            },
            {
              event: "end_phase",
              effects: [{ kind: "dec", target: { kind: "var", id: "timer" }, amount: 1 }],
            },
          ],
        },
      });
      const state = createInitialState(definition);
      // Both timers start at 3, no one eligible

      // The end_phase stepEffect fires (timer decrements for current player)
      advanceTurnPhase(definition, state);

      // The stepEffect with dec fires during end_phase trigger processing
      // It fires for the current player context
      assert.equal(state.variables.perPlayer[1].timer, 2);
    });
  });

  describe("schema validation", () => {
    it("validates a definition using reactive scheduler", async () => {
      const { default: Ajv } = await import("ajv/dist/2020.js");
      const { readFileSync } = await import("node:fs");
      const schema = JSON.parse(
        readFileSync(
          new URL("../../../schemas/dsl/game-definition.v1.json", import.meta.url),
          "utf-8"
        )
      );

      const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
      const validate = ajv.compile(schema);

      const definition = {
        version: "1.0",
        players: { count: 2 },
        state: {
          variables: [
            { id: "timer", scope: "per_player", type: { kind: "int", min: 0 }, initial: 3 },
          ],
        },
        actions: [
          {
            id: "wait",
            actor: "player",
            effects: [{ kind: "inc", target: { kind: "var", id: "timer" }, amount: 1 }],
          },
        ],
        turn: { scheduler: "reactive", phases: ["main"] },
        termination: { conditions: [] },
      };

      const valid = validate(definition);
      assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
    });
  });
});
