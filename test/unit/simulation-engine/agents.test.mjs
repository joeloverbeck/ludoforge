import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/index.js";
import {
  createGreedyPolicy,
  createRandomPolicy,
  createSeededRng,
} from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
} from "./fixtures.mjs";

describe("agents", () => {
  describe("createRandomPolicy", () => {
    it("uses provided RNG for deterministic selection", () => {
      const definition = createBaseDefinition();
      const actionA = createIncrementAction();
      const actionB = createNoopAction();
      definition.actions = [actionA, actionB];
      const state = createInitialState(definition);
      const context = {
        playerId: state.turn.currentPlayer,
        phase: state.turn.phase,
        turn: state.turn.turn,
      };
      const expectedRng = createSeededRng(42);
      const expectedIndex = expectedRng.nextInt(definition.actions.length);
      const rng = createSeededRng(42);
      const policy = createRandomPolicy();

      const selection = policy.selectAction({
        definition,
        state,
        legalActions: definition.actions,
        context,
        rng,
      });

      assert.equal(selection?.id, definition.actions[expectedIndex].id);
    });

    it("returns { actionId, args } when legalMoves are provided", () => {
      const action = {
        id: "attack",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action, domains: { t: ["token_1", "token_2", "token_3"] } },
      ];
      const rng = createSeededRng(42);
      const policy = createRandomPolicy();

      const selection = policy.selectAction({
        legalActions: [action],
        legalMoves,
        rng,
      });

      assert.ok(selection.actionId);
      assert.equal(selection.actionId, "attack");
      assert.ok(selection.args);
      assert.ok(["token_1", "token_2", "token_3"].includes(selection.args.t));
    });

    it("picks args deterministically with seeded RNG", () => {
      const action = {
        id: "attack",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board", tokenType: "unit" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action, domains: { t: ["token_1", "token_2", "token_3"] } },
      ];
      const policy = createRandomPolicy();

      const rng1 = createSeededRng(99);
      const sel1 = policy.selectAction({ legalActions: [action], legalMoves, rng: rng1 });

      const rng2 = createSeededRng(99);
      const sel2 = policy.selectAction({ legalActions: [action], legalMoves, rng: rng2 });

      assert.deepEqual(sel1, sel2);
    });

    it("returns { actionId, args: {} } for no-param action via legalMoves", () => {
      const action = { id: "noop", actor: "player", effects: [] };
      const legalMoves = [{ action, domains: {} }];
      const rng = createSeededRng(1);
      const policy = createRandomPolicy();

      const selection = policy.selectAction({
        legalActions: [action],
        legalMoves,
        rng,
      });

      assert.equal(selection.actionId, "noop");
      assert.deepEqual(selection.args, {});
    });

    it("handles multi-select params (count > 1)", () => {
      const action = {
        id: "multi",
        actor: "player",
        params: [
          { id: "targets", kind: "token", count: 2, unique: true, domain: { selector: { zone: "board" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action, domains: { targets: ["t1", "t2", "t3"] } },
      ];
      const rng = createSeededRng(42);
      const policy = createRandomPolicy();

      const selection = policy.selectAction({
        legalActions: [action],
        legalMoves,
        rng,
      });

      assert.equal(selection.actionId, "multi");
      assert.ok(Array.isArray(selection.args.targets));
      assert.equal(selection.args.targets.length, 2);
      assert.notEqual(selection.args.targets[0], selection.args.targets[1]);
    });
  });

  describe("createGreedyPolicy", () => {
    it("falls back to the first legal action without a heuristic", () => {
      const definition = createBaseDefinition();
      const actionA = createIncrementAction();
      const actionB = createNoopAction();
      definition.actions = [actionA, actionB];
      const state = createInitialState(definition);
      const context = {
        playerId: state.turn.currentPlayer,
        phase: state.turn.phase,
        turn: state.turn.turn,
      };
      const policy = createGreedyPolicy();

      const selection = policy.selectAction({
        definition,
        state,
        legalActions: definition.actions,
        context,
      });

      assert.equal(selection?.id, actionA.id);
    });

    it("selects the highest scoring action", () => {
      const definition = createBaseDefinition();
      const actionA = createIncrementAction();
      const actionB = createNoopAction();
      definition.actions = [actionA, actionB];
      const state = createInitialState(definition);
      const context = {
        playerId: state.turn.currentPlayer,
        phase: state.turn.phase,
        turn: state.turn.turn,
      };
      const policy = createGreedyPolicy({
        scoreAction({ action }) {
          return action.id === "noop" ? 10 : 1;
        },
      });

      const selection = policy.selectAction({
        definition,
        state,
        legalActions: definition.actions,
        context,
      });

      assert.equal(selection?.id, actionB.id);
    });

    it("returns { actionId, args } when legalMoves provided without heuristic", () => {
      const action = {
        id: "attack",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action, domains: { t: ["token_1", "token_2"] } },
      ];
      const policy = createGreedyPolicy();

      const selection = policy.selectAction({
        legalActions: [action],
        legalMoves,
      });

      assert.equal(selection.actionId, "attack");
      assert.equal(selection.args.t, "token_1");
    });

    it("scores action+args combinations and picks best", () => {
      const action = {
        id: "attack",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action, domains: { t: ["token_1", "token_2", "token_3"] } },
      ];
      const policy = createGreedyPolicy({
        scoreAction({ args }) {
          if (args?.t === "token_3") return 100;
          if (args?.t === "token_2") return 50;
          return 1;
        },
      });

      const selection = policy.selectAction({
        legalActions: [action],
        legalMoves,
      });

      assert.equal(selection.actionId, "attack");
      assert.equal(selection.args.t, "token_3");
    });

    it("picks best across multiple actions with different domains", () => {
      const attack = {
        id: "attack",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board" } } },
        ],
        effects: [],
      };
      const heal = {
        id: "heal",
        actor: "player",
        params: [
          { id: "t", kind: "token", domain: { selector: { zone: "board" } } },
        ],
        effects: [],
      };
      const legalMoves = [
        { action: attack, domains: { t: ["t1", "t2"] } },
        { action: heal, domains: { t: ["t1", "t2"] } },
      ];
      const policy = createGreedyPolicy({
        scoreAction({ action, args }) {
          if (action.id === "heal" && args?.t === "t2") return 999;
          return 1;
        },
      });

      const selection = policy.selectAction({
        legalActions: [attack, heal],
        legalMoves,
      });

      assert.equal(selection.actionId, "heal");
      assert.equal(selection.args.t, "t2");
    });
  });
});
