import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../src/game-kernel/state.js";
import {
  createEventStream,
  computeScoresAtState,
  evaluateTermination,
} from "../../src/game-kernel/index.js";

/**
 * Minimal definition factory — 2 players, configurable variables, zones,
 * termination conditions, and scoring.
 */
function makeDefinition(overrides = {}) {
  return {
    version: "1.0",
    players: { count: overrides.playerCount ?? 2 },
    state: {
      variables: overrides.variables ?? [
        { id: "hp", scope: "per_player", type: { kind: "int" }, initial: 10 },
        { id: "round", scope: "global", type: { kind: "int" }, initial: 0 },
      ],
      zones: overrides.zones ?? [],
    },
    actions: [],
    turn: { scheduler: "round_robin", phases: ["main"] },
    termination: overrides.termination ?? { conditions: [] },
    triggers: [],
  };
}

describe("termination evaluation (integration)", () => {
  describe("variable-based termination", () => {
    it("triggers win when per-player variable meets condition", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "<=",
                left: { kind: "ref", ref: { kind: "var", id: "hp" } },
                right: { kind: "value", value: 0 },
              },
              outcome: { type: "lose", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);
      state.variables.perPlayer[1].hp = 0;

      const result = evaluateTermination(definition, state, {
        activePlayerId: 1,
      });
      assert.equal(result.terminated, true);
      assert.equal(result.reason, "condition");
      assert.equal(result.conditionIndex, 0);
      assert.equal(result.outcomes[1], "lose");
      assert.equal(result.outcomes[2], "win");
    });

    it("does not trigger when condition is not met", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "<=",
                left: { kind: "ref", ref: { kind: "var", id: "hp" } },
                right: { kind: "value", value: 0 },
              },
              outcome: { type: "lose", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state, {
        activePlayerId: 1,
      });
      assert.equal(result.terminated, false);
    });
  });

  describe("zone-query termination", () => {
    it("triggers when zone token count meets threshold", () => {
      const definition = makeDefinition({
        zones: [
          { id: "hand", scope: "per_player", tokenType: "card" },
        ],
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "==",
                left: {
                  kind: "ref",
                  ref: { kind: "zone_query", id: "hand", query: "count", player: "self" },
                },
                right: { kind: "value", value: 0 },
              },
              outcome: { type: "win", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);
      // Player 1's hand is empty (initial state)

      const result = evaluateTermination(definition, state, {
        activePlayerId: 1,
      });
      assert.equal(result.terminated, true);
      assert.equal(result.outcomes[1], "win");
      assert.equal(result.outcomes[2], "lose");
    });
  });

  describe("meta-based termination", () => {
    it("triggers lose when legalActionCount == 0", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "==",
                left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
                right: { kind: "value", value: 0 },
              },
              outcome: { type: "lose", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state, {
        activePlayerId: 2,
        meta: { legalActionCount: 0 },
      });
      assert.equal(result.terminated, true);
      assert.equal(result.outcomes[2], "lose");
      assert.equal(result.outcomes[1], "win");
    });

    it("does not trigger when legalActionCount > 0", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "==",
                left: { kind: "ref", ref: { kind: "meta", id: "legalActionCount" } },
                right: { kind: "value", value: 0 },
              },
              outcome: { type: "lose", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state, {
        activePlayerId: 2,
        meta: { legalActionCount: 3 },
      });
      assert.equal(result.terminated, false);
    });

    it("derives hasLegalActions from legalActionCount", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: "==",
                left: { kind: "ref", ref: { kind: "meta", id: "hasLegalActions" } },
                right: { kind: "value", value: false },
              },
              outcome: { type: "draw", players: "all" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const matched = evaluateTermination(definition, state, {
        activePlayerId: 1,
        meta: { legalActionCount: 0 },
      });
      assert.equal(matched.terminated, true);

      const missed = evaluateTermination(definition, state, {
        activePlayerId: 1,
        meta: { legalActionCount: 1 },
      });
      assert.equal(missed.terminated, false);
    });
  });

  describe("scoring computation", () => {
    it("returns per-player scores from scoring expression", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [],
          scoring: {
            perPlayer: { kind: "ref", ref: { kind: "var", id: "hp" } },
          },
        },
      });
      const state = createInitialState(definition);
      state.variables.perPlayer[1].hp = 7;
      state.variables.perPlayer[2].hp = 3;

      const scores = computeScoresAtState(definition, state);
      assert.deepEqual(scores, { 1: 7, 2: 3 });
    });

    it("returns undefined when no scoring configured", () => {
      const definition = makeDefinition();
      const state = createInitialState(definition);
      assert.equal(computeScoresAtState(definition, state), undefined);
    });
  });

  describe("max-turns fallback", () => {
    it("returns draw for all players on max-turns", () => {
      const definition = makeDefinition();
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state, {
        maxTurnsReached: true,
      });
      assert.equal(result.terminated, true);
      assert.equal(result.reason, "max-turns");
      assert.deepEqual(result.outcomes, { 1: "draw", 2: "draw" });
    });

    it("condition match takes priority over max-turns", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: ">=",
                left: { kind: "ref", ref: { kind: "var", id: "round" } },
                right: { kind: "value", value: 5 },
              },
              outcome: { type: "win", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);
      state.variables.global.round = 5;

      const result = evaluateTermination(definition, state, {
        activePlayerId: 1,
        maxTurnsReached: true,
      });
      assert.equal(result.reason, "condition");
    });
  });

  describe("outcome player resolution", () => {
    it("resolves 'active' to the active player", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: { kind: "value", value: true },
              outcome: { type: "win", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state, {
        activePlayerId: 2,
      });
      assert.equal(result.outcomes[2], "win");
      assert.equal(result.outcomes[1], "lose");
    });

    it("resolves 'all' to all players", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: { kind: "value", value: true },
              outcome: { type: "draw", players: "all" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state);
      assert.deepEqual(result.outcomes, { 1: "draw", 2: "draw" });
    });

    it("resolves explicit player list", () => {
      const definition = makeDefinition({
        playerCount: 3,
        variables: [
          { id: "hp", scope: "per_player", type: { kind: "int" }, initial: 10 },
        ],
        termination: {
          conditions: [
            {
              condition: { kind: "value", value: true },
              outcome: { type: "win", players: [1, 3] },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state);
      assert.equal(result.outcomes[1], "win");
      assert.equal(result.outcomes[2], "lose");
      assert.equal(result.outcomes[3], "win");
    });
  });

  describe("event recording", () => {
    it("appends termination event to event stream", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: { kind: "value", value: true },
              outcome: { type: "draw", players: "all" },
            },
          ],
        },
      });
      const state = createInitialState(definition);
      const events = createEventStream();

      evaluateTermination(definition, state, { events });

      assert.equal(events.length, 1);
      assert.equal(events[0].type, "termination");
      assert.equal(events[0].reason, "condition");
      assert.deepEqual(events[0].outcomes, { 1: "draw", 2: "draw" });
    });

    it("does not record event when not terminated", () => {
      const definition = makeDefinition();
      const state = createInitialState(definition);
      const events = createEventStream();

      evaluateTermination(definition, state, { events });

      assert.equal(events.length, 0);
    });
  });

  describe("no termination", () => {
    it("returns terminated: false when no conditions match", () => {
      const definition = makeDefinition({
        termination: {
          conditions: [
            {
              condition: {
                kind: "cmp",
                op: ">=",
                left: { kind: "ref", ref: { kind: "var", id: "round" } },
                right: { kind: "value", value: 99 },
              },
              outcome: { type: "win", players: "active" },
            },
          ],
        },
      });
      const state = createInitialState(definition);

      const result = evaluateTermination(definition, state);
      assert.equal(result.terminated, false);
      assert.equal(result.outcomes, undefined);
      assert.equal(result.scores, undefined);
    });
  });
});
