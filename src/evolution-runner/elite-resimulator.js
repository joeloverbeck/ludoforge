/**
 * Re-simulate elite genomes and extract trajectory step arrays.
 * @module evolution-runner/elite-resimulator
 */

import { createSimulationEngine, createRandomPolicy, createSeededRng } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";

/**
 * @param {Array<{ genome: object, fitness: number }>} elites
 * @param {{ simulationConfig?: object, seed?: number, simulationRuns?: number }} options
 * @returns {Promise<object[][]>} - flat list of step arrays across all elites and runs
 */
export async function extractEliteTrajectories(elites, options) {
  const { simulationConfig = {}, seed = 0, simulationRuns = 3 } = options;
  const trajectories = [];

  for (let eliteIndex = 0; eliteIndex < elites.length; eliteIndex += 1) {
    const elite = elites[eliteIndex];
    const definition = elite.genome.definition;
    const playerCount = definition.players?.count ?? 2;

    const agents = [];
    for (let p = 0; p < playerCount; p += 1) {
      agents.push({ playerId: p, policy: createRandomPolicy() });
    }

    const rngSeed = ((seed + eliteIndex) >>> 0) % (2 ** 32);
    const rng = createSeededRng(rngSeed);

    const engineConfig = resolveSimulationDefaults({
      ...simulationConfig,
      definition,
      agents,
      rng,
      trace: true,
    });

    const engine = createSimulationEngine(engineConfig);
    const results = await engine.runBatch(simulationRuns);

    for (const result of results) {
      const steps = result?.trajectory?.steps;
      if (Array.isArray(steps) && steps.length > 0) {
        trajectories.push(steps);
      }
    }
  }

  return trajectories;
}
