import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfigFile } from "../../../src/config/loader.js";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

async function writeSimulationConfig(overrides = {}) {
  const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-sim-config-"));
  const config = {
    version: 1,
    maxTurns: null,
    maxSteps: null,
    loopDetection: { enabled: false, maxRepeatedStates: null },
    turn: { noLegalActions: { policy: "stalemate", reason: null } },
    rng: { seed: null, algorithm: "lcg32" },
    ...overrides,
  };

  await writeFile(
    join(baseDir, "simulation.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );

  const result = await loadConfigFile({ name: "simulation", configDir: baseDir });
  assert.equal(result.valid, true);
  return result.config;
}

describe("config-defaults", () => {
  describe("simulationConfig defaults", () => {
    it("applies config defaults when per-run values are missing", async () => {
      const simulationConfig = await writeSimulationConfig({
        maxTurns: 1,
        turn: { noLegalActions: { policy: "pass", reason: null } },
      });

      const definition = createBaseDefinition();
      definition.actions = [];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        simulationConfig,
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "max-turns");
      assert.equal(result.terminated, false);
      assert.equal(result.trajectory.steps.length, 1);
      assert.equal(result.trajectory.steps[0].actionId, null);
    });
  });

  describe("per-run overrides", () => {
    it("per-run maxSteps overrides simulation config defaults", async () => {
      const simulationConfig = await writeSimulationConfig({ maxSteps: 1 });

      const definition = createBaseDefinition();
      definition.actions = [createIncrementAction()];
      definition.termination.conditions = [];

      const engine = createSimulationEngine({
        definition,
        agents: [createFirstActionAgent()],
        maxSteps: 2,
        simulationConfig,
      });

      const result = await engine.run();

      assert.equal(result.terminationReason, "max-steps");
      assert.equal(result.terminated, false);
      assert.equal(result.trajectory.steps.length, 2);
    });
  });
});
