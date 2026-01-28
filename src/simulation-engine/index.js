import { runSimulation } from "./loop.js";
import { runRollout } from "./rollout.js";
import { runBatchSimulations } from "./batch.js";
import { createSeededRng } from "./rng.js";
import { createGreedyPolicy } from "./agents/greedy.js";
import { createRandomPolicy } from "./agents/random.js";

export function createSimulationEngine(config) {
  if (!config || !config.definition) {
    throw new Error("Simulation engine requires a game definition.");
  }
  if (!Array.isArray(config.agents) || config.agents.length === 0) {
    throw new Error("Simulation engine requires at least one agent.");
  }

  return {
    run() {
      return runSimulation(config);
    },
    runBatch(count) {
      if (!Number.isInteger(count) || count <= 0) {
        throw new Error("runBatch requires a positive integer count.");
      }
      const results = [];
      for (let index = 0; index < count; index += 1) {
        results.push(runSimulation(config));
      }
      return results;
    },
  };
}

export { runBatchSimulations };
export { runRollout };
export { createSeededRng };
export { createGreedyPolicy, createRandomPolicy };
