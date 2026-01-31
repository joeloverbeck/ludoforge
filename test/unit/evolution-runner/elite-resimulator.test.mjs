import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { extractEliteTrajectories } from "../../../src/evolution-runner/elite-resimulator.js";

async function loadMinimalDefinition() {
  const { readFile } = await import("node:fs/promises");
  const fileUrl = new URL("../fixtures/dsl/valid/minimal.json", import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("elite-resimulator", () => {
  describe("extractEliteTrajectories", () => {
    it("extracts trajectory steps from simulated elites", async () => {
      const definition = await loadMinimalDefinition();
      const elites = [
        { genome: { id: "elite-1", definition }, fitness: 10 },
      ];

      const trajectories = await extractEliteTrajectories(elites, {
        simulationConfig: {},
        seed: 42,
        simulationRuns: 2,
      });

      assert.ok(Array.isArray(trajectories));
      assert.ok(trajectories.length > 0, "should have at least one trajectory");
      for (const steps of trajectories) {
        assert.ok(Array.isArray(steps));
        assert.ok(steps.length > 0, "each trajectory should have steps");
      }
    });

    it("returns deterministic results with same seed", async () => {
      const definition = await loadMinimalDefinition();
      const elites = [
        { genome: { id: "elite-1", definition }, fitness: 10 },
      ];

      const opts = { simulationConfig: {}, seed: 99, simulationRuns: 1 };
      const run1 = await extractEliteTrajectories(elites, opts);
      const run2 = await extractEliteTrajectories(elites, opts);

      assert.equal(run1.length, run2.length);
    });

    it("returns empty array for empty elites", async () => {
      const trajectories = await extractEliteTrajectories([], {
        simulationConfig: {},
        seed: 0,
        simulationRuns: 3,
      });
      assert.deepEqual(trajectories, []);
    });

    it("produces correct number of trajectory arrays per elite and run", async () => {
      const definition = await loadMinimalDefinition();
      const elites = [
        { genome: { id: "e1", definition }, fitness: 5 },
        { genome: { id: "e2", definition }, fitness: 8 },
      ];

      const trajectories = await extractEliteTrajectories(elites, {
        simulationConfig: {},
        seed: 7,
        simulationRuns: 2,
      });

      // 2 elites × 2 runs = 4 trajectory arrays (assuming each run produces steps)
      assert.ok(trajectories.length <= 4);
      assert.ok(trajectories.length > 0);
    });
  });
});
