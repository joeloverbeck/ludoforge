import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeTurn } from "../../../src/human-interface/router.js";
import { createBaseDefinition, createIncrementAction } from "../simulation-engine/fixtures.mjs";

const baseState = () => ({
  variables: {
    global: { score: 0 },
    perPlayer: {
      1: { health: 10 },
      2: { health: 10 },
    },
  },
  zones: {
    table: {
      id: "table",
      tokenType: "card",
      scope: "global",
      order: "unordered",
      visibility: "public",
      tokens: ["t1", "t2"],
    },
    deck: {
      id: "deck",
      tokenType: "card",
      scope: "global",
      order: "ordered",
      visibility: "private",
      tokens: ["t3", "t4"],
    },
    hand: {
      id: "hand",
      tokenType: "card",
      scope: "per_player",
      order: "unordered",
      visibility: "public",
      tokensByPlayer: {
        1: ["t5"],
        2: ["t6", "t7"],
      },
    },
    secret: {
      id: "secret",
      tokenType: "card",
      scope: "per_player",
      order: "unordered",
      visibility: "private",
      tokensByPlayer: {
        1: ["t8"],
        2: ["t9"],
      },
    },
  },
  turn: {
    currentPlayer: 1,
    phase: "main",
    turn: 3,
  },
});

function createIo(inputs = []) {
  const lines = [];
  return {
    lines,
    readLine: async () => inputs.shift(),
    writeLine: (line) => {
      lines.push(line);
    },
  };
}

describe("router", () => {
  describe("routeTurn", () => {
    describe("human participants", () => {
      it("prompts the active human and keeps private zones scoped", async () => {
        const definition = createBaseDefinition();
        definition.players.count = 2;
        definition.actions = [createIncrementAction()];
        const state = baseState();
        const io = createIo(["1"]);

        const result = await routeTurn({
          definition,
          state,
          participants: [
            { kind: "human", playerId: 1, name: "Alice", io },
            { kind: "human", playerId: 2, name: "Bob", io: createIo(["1"]) },
          ],
        });

        assert.equal(result.action.id, "tick");
        const output = io.lines.join("\n");
        assert.ok(output.includes("secret (per_player/private/unordered)"));
        assert.ok(output.includes("Player 1: t8"));
        assert.ok(!output.includes("Player 2: t9"));
      });
    });

    describe("AI participants", () => {
      it("delegates to AI providers without prompting humans", async () => {
        const definition = createBaseDefinition();
        definition.players.count = 2;
        definition.actions = [createIncrementAction()];
        const state = baseState();
        state.turn.currentPlayer = 2;
        let calls = 0;
        const aiProvider = ({ legalActions }) => {
          calls += 1;
          return legalActions[0].id;
        };
        const unusedIo = {
          readLine: async () => {
            throw new Error("Human IO should not be used for AI turns.");
          },
          writeLine: () => {
            throw new Error("Human IO should not be used for AI turns.");
          },
        };

        const result = await routeTurn({
          definition,
          state,
          participants: [
            { kind: "human", playerId: 1, name: "Alice", io: unusedIo },
            { kind: "ai", playerId: 2, name: "Bot", actionProvider: aiProvider },
          ],
        });

        assert.equal(result.action.id, "tick");
        assert.equal(calls, 1);
      });
    });
  });
});
