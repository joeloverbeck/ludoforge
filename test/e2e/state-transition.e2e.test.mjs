import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialState } from "../../src/game-kernel/index.js";
import { createMockHumanIo } from "./helpers/mock-human-io.js";
import { runHumanLoopOnce } from "./helpers/run-human-loop.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

test("state transitions apply deterministically for distinct actions", async () => {
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

test("state transition loop fails clearly when no legal actions exist", async () => {
  const definition = await loadFixture("minimal-game.json");
  const state = createInitialState(definition);
  state.variables.global.score = 3;

  const { io } = createMockHumanIo(["1"]);
  await assert.rejects(
    () =>
      runHumanLoopOnce({
        definition,
        state,
        io,
        promptLabel: "Choose",
      }),
    /No legal actions available/,
  );
});
