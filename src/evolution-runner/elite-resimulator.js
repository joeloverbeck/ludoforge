/**
 * Re-simulate elite genomes and extract trajectory step arrays.
 * @module evolution-runner/elite-resimulator
 */

import { createSimulationEngine, createRandomPolicy, createSeededRng } from "../simulation-engine/index.js";
import { resolveSimulationDefaults } from "../simulation-engine/simulation-defaults.js";

/**
 * @param {Array<{ genome: object, fitness: number }>} elites
 * @param {{ simulationConfig?: object, seed?: number, simulationRuns?: number, signal?: AbortSignal|null, logger?: object|null }} options
 * @returns {Promise<object[][]>} - flat list of step arrays across all elites and runs
 */
export async function extractEliteTrajectories(elites, options) {
  const { simulationConfig = {}, seed = 0, simulationRuns = 3, signal = null, logger = null } = options;
  const trajectories = [];

  if (logger) {
    logger.info({ eliteCount: elites.length, simulationRuns }, "extractEliteTrajectories: start");
  }

  for (let eliteIndex = 0; eliteIndex < elites.length; eliteIndex += 1) {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }

    const elite = elites[eliteIndex];
    const definition = elite.genome.definition;
    const playerCount = definition.players?.count ?? 2;

    if (logger) {
      logger.info(
        { eliteIndex, genomeId: elite.genome.id, fitness: elite.fitness },
        "extractEliteTrajectories: simulating elite",
      );
    }

    const eliteStart = Date.now();

    const agents = [];
    for (let p = 0; p < playerCount; p += 1) {
      agents.push(createRandomPolicy());
    }

    const rngSeed = ((seed + eliteIndex) >>> 0) % (2 ** 32);
    const rng = createSeededRng(rngSeed);

    const engineConfig = resolveSimulationDefaults({
      ...simulationConfig,
      definition,
      agents,
      rng,
      trace: true,
      signal,
    });

    const engine = createSimulationEngine(engineConfig);

    // Run simulations one at a time so we can check the abort signal between runs
    for (let runIndex = 0; runIndex < simulationRuns; runIndex += 1) {
      if (signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }

      const result = await engine.run();
      const steps = result?.trajectory?.steps;
      if (Array.isArray(steps) && steps.length > 0) {
        trajectories.push(steps);
      }
    }

    if (logger) {
      logger.info(
        { eliteIndex, durationMs: Date.now() - eliteStart },
        "extractEliteTrajectories: elite complete",
      );
    }
  }

  if (logger) {
    logger.info({ trajectoryCount: trajectories.length }, "extractEliteTrajectories: done");
  }

  return trajectories;
}
