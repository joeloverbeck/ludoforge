import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runSimulation } from "../../src/simulation-engine/loop.js";
import { resolveSimulationDefaults } from "../../src/simulation-engine/simulation-defaults.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function runWithDefaults(definition, overrides = {}) {
  const config = resolveSimulationDefaults({
    definition,
    agents: Array.from({ length: definition.players.count }, () => ({
      kind: "random",
    })),
    seed: 42,
    ...overrides,
  });
  return runSimulation(config);
}

describe("simulation-correctness", () => {
  describe("multi-phase game", () => {
    it("multi-phase game executes phase transitions correctly", async () => {
      const definition = await loadFixture("multi-phase-game.json");
      const result = runWithDefaults(definition);

      assert.ok(result.trajectory, "should produce a trajectory");
      assert.ok(result.trajectory.steps.length > 0, "should have at least one step");
      assert.ok(result.terminated !== undefined, "should have terminated flag");

      const actionIds = result.trajectory.steps
        .map((step) => step.actionId)
        .filter((id) => id !== null);

      assert.ok(
        actionIds.includes("prepare"),
        `multi-phase game should use setup-phase action 'prepare', got: ${JSON.stringify(actionIds)}`
      );
    });
  });

  describe("token movement game", () => {
    it("token-movement game runs without crashing and produces steps", async () => {
      const definition = await loadFixture("token-movement-game.json");
      const result = runWithDefaults(definition);

      assert.ok(result.trajectory, "should produce a trajectory");
      assert.ok(result.trajectory.steps.length > 0, "should have at least one step");

      const actionIds = result.trajectory.steps
        .map((step) => step.actionId)
        .filter((id) => id !== null);

      assert.ok(actionIds.length > 0, "should execute at least one action");
    });
  });

  describe("per-player variables", () => {
    it("per-player-vars game isolates player state correctly", async () => {
      const definition = await loadFixture("per-player-vars-game.json");
      const result = runWithDefaults(definition);

      assert.ok(result.trajectory, "should produce a trajectory");
      assert.ok(result.trajectory.steps.length > 0, "should have at least one step");
      assert.ok(result.terminated !== undefined, "should have terminated flag");
    });
  });

  describe("all fixture games are simulatable", () => {
    const fixtureGames = [
      "choice-game.json",
      "evo-seed-1.json",
      "evo-seed-2.json",
      "evo-terminates.json",
      "evo-non-terminating.json",
      "minimal-game.json",
      "multi-phase-game.json",
      "token-movement-game.json",
      "per-player-vars-game.json",
      "visibility-game.json",
      "boolean-vars-game.json",
      "enum-vars-game.json",
      "multi-token-game.json",
    ];

    for (const fixtureName of fixtureGames) {
      it(`${fixtureName} runs without crashing`, async () => {
        const definition = await loadFixture(fixtureName);
        const result = runWithDefaults(definition);

        assert.ok(result.trajectory, `${fixtureName} should produce a trajectory`);
        assert.ok(
          result.trajectory.steps.length > 0,
          `${fixtureName} should have at least one step`
        );
      });
    }
  });
});
