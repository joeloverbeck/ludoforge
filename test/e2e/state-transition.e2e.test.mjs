import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialState } from "../../src/game-kernel/index.js";
import { runSimulation } from "../../src/simulation-engine/loop.js";
import { createMockHumanIo } from "./helpers/mock-human-io.js";
import { runHumanLoopOnce } from "./helpers/run-human-loop.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("state-transition", () => {
  describe("deterministic action application", () => {
    it("state transitions apply deterministically for distinct actions", async () => {
      const definition = await loadFixture("choice-game.json");

      const chargeState = createInitialState(definition);
      const chargeIo = createMockHumanIo(["1"]);
      const chargeResult = await runHumanLoopOnce({
        definition,
        state: chargeState,
        io: chargeIo.io,
        promptLabel: "Choose",
      });

      assert.equal(chargeResult.action.id, "charge");
      assert.equal(chargeState.variables.global.energy, 1);
      assert.equal(chargeState.turn.currentPlayer, 2);
      assert.equal(chargeState.turn.turn, 2);

      const spendState = createInitialState(definition);
      spendState.variables.global.energy = 1;
      const spendIo = createMockHumanIo(["2"]);
      const spendResult = await runHumanLoopOnce({
        definition,
        state: spendState,
        io: spendIo.io,
        promptLabel: "Choose",
      });

      assert.equal(spendResult.action.id, "spend");
      assert.equal(spendState.variables.global.energy, 0);
      assert.equal(spendState.turn.currentPlayer, 2);
      assert.equal(spendState.turn.turn, 2);
    });
  });

  describe("no-legal-actions policies", () => {
    it("state transition loop defaults to stalemate when no-legal-actions is unset", async () => {
      const definition = await loadFixture("no-legal-actions-stalemate.json");
      const result = runSimulation({ definition });

      assert.equal(result.terminationReason, "stalemate");
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
    });

    it("state transition loop uses no-legal-actions terminate policy outcomes", async () => {
      const definition = await loadFixture("no-legal-actions-terminate.json");
      const result = runSimulation({ definition });

      assert.equal(result.terminationReason, "no-legal-actions");
      assert.equal(result.terminationDetail, "no-legal-actions");
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
    });

    it("state transition loop passes when no-legal-actions policy is pass", async () => {
      const definition = await loadFixture("no-legal-actions-pass.json");
      const agent = {
        id: 2,
        selectAction: () => "advance",
      };
      const result = runSimulation({ definition, agents: [agent] });

      assert.equal(result.trajectory.steps[0].actionId, null);
      assert.equal(result.trajectory.steps[0].legalActionCount, 0);
      assert.equal(result.trajectory.steps[1].actionId, "advance");
      assert.equal(result.trajectory.steps[1].playerId, 2);
    });

    it("state transition loop throws for no-legal-actions error policy", async () => {
      const definition = await loadFixture("no-legal-actions-error.json");

      assert.throws(() => runSimulation({ definition }), /No legal actions: no-legal-actions/);
    });
  });
});
