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
  });
});
