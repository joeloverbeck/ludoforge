import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialState } from "../../src/game-kernel/index.js";
import { routeTurn } from "../../src/human-interface/index.js";
import { createMockHumanIo } from "./helpers/mock-human-io.js";
import { expectOutput } from "./helpers/expect-output.js";
import { runHumanLoopOnce } from "./helpers/run-human-loop.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("human-loop", () => {
  describe("prompting and action application", () => {
    it("human loop helper prompts, applies action, and advances turn", async () => {
      const definition = await loadFixture("choice-game.json");
      const state = createInitialState(definition);
      state.variables.global.energy = 1;

      const { io, outputs } = createMockHumanIo(["2"]);
      const result = await runHumanLoopOnce({
        definition,
        state,
        io,
        promptLabel: "Pick action",
      });

      assert.equal(result.action.id, "spend");
      assert.equal(state.variables.global.energy, 0);
      assert.equal(state.turn.currentPlayer, 2);
      assert.equal(state.turn.turn, 2);

      expectOutput(outputs, [
        "Turn 1 | Active Player: 1",
        "Actions:",
        "1) charge",
        "2) spend",
        "Pick action (1-2):",
      ]);
    });

    it("human loop re-prompts on invalid input before accepting a valid choice", async () => {
      const definition = await loadFixture("choice-game.json");
      const state = createInitialState(definition);

      const { io, outputs } = createMockHumanIo(["nope", "5", "1"]);
      const result = await runHumanLoopOnce({
        definition,
        state,
        io,
        promptLabel: "Select action",
      });

      assert.equal(result.action.id, "charge");
      assert.equal(state.variables.global.energy, 1);

      expectOutput(outputs, [
        "Select action (1-1):",
        "Invalid choice. Enter a number from 1 to 1.",
      ]);
    });
  });

  describe("participant routing", () => {
    it("mixed participants route to human and AI selectors", async () => {
      const definition = await loadFixture("choice-game.json");
      const state = createInitialState(definition);
      const { io, outputs } = createMockHumanIo(["1"]);
      const participants = [
        { kind: "human", playerId: 1, name: "Alice", io },
        {
          kind: "ai",
          playerId: 2,
          name: "Bot",
          actionProvider: ({ legalActions }) => {
            return legalActions.find((action) => action.id === "spend")?.id ?? legalActions[0].id;
          },
        },
      ];

      const humanResult = await routeTurn({ definition, state, participants });
      assert.equal(humanResult.participant.kind, "human");
      assert.equal(humanResult.action.id, "charge");

      expectOutput(outputs, ["Choose action for Alice (1-1):"]);
      const outputCount = outputs.length;

      state.turn.currentPlayer = 2;
      state.variables.global.energy = 1;

      const aiResult = await routeTurn({ definition, state, participants });
      assert.equal(aiResult.participant.kind, "ai");
      assert.equal(aiResult.action.id, "spend");
      assert.equal(outputs.length, outputCount);
    });
  });

  describe("no-legal-actions policy", () => {
    it("human loop skips prompting when no-legal-actions policy is pass", async () => {
      const definition = await loadFixture("no-legal-actions-pass.json");
      const state = createInitialState(definition);
      const { io, outputs } = createMockHumanIo([]);

      const result = await runHumanLoopOnce({
        definition,
        state,
        io,
        promptLabel: "Pick action",
      });

      assert.equal(result.passed, true);
      assert.equal(result.action, null);
      assert.equal(state.turn.currentPlayer, 2);
      assert.ok(outputs.every((line) => !line.includes("Pick action")));
    });
  });
});
