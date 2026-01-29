import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMockSimulation } from "./helpers/mock-simulation.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("mock-simulation", () => {
  describe("terminal outcome", () => {
    it("mock simulation returns a terminal outcome within the turn cap", async () => {
      const definition = await loadFixture("evo-terminates.json");
      const helper = createMockSimulation({ seed: 11, maxTurns: 4, terminalTurns: 2 });

      const result = helper.run({ definition, mode: "terminal" });

      assert.equal(result.terminationReason, "condition");
      assert.equal(result.terminated, true);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 2);
      assert.ok(result.trajectory.steps.length <= 4);
    });
  });

  describe("max-turns cutoff", () => {
    it("mock simulation uses a max-turns cutoff for non-terminating scenarios", async () => {
      const definition = await loadFixture("evo-non-terminating.json");
      const helper = createMockSimulation({ seed: 7, maxTurns: 3 });

      const result = helper.run({ definition, mode: "cutoff" });

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
      assert.ok(!("reason" in result.outcome));
      assert.equal(result.trajectory.steps.length, 3);
    });
  });

  describe("determinism", () => {
    it("mock simulation output is deterministic for the same seed", async () => {
      const definition = await loadFixture("choice-game.json");
      const helper = createMockSimulation({ seed: 41, maxTurns: 3, terminalTurns: 2 });
      const helperRepeat = createMockSimulation({ seed: 41, maxTurns: 3, terminalTurns: 2 });

      const first = helper.run({ definition, mode: "terminal" });
      const second = helperRepeat.run({ definition, mode: "terminal" });

      assert.deepEqual(first, second);
    });
  });
});
