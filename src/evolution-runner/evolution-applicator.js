import { crossoverGenome } from "../evolutionary-engine/crossover.js";
import { mutateAndRepairGenome } from "../evolutionary-engine/mutation.js";
import { cloneGenome, clonePopulation, selectMateIndex } from "./population-utils.js";
import { shouldApply } from "./evolution-rates.js";
import { recordAttempt, recordNoOp, recordRepairFailed } from "./operator-telemetry.js";

function produceOffspring(parent, parentIndex, parents, options, maxRetries, logger) {
  let child = cloneGenome(parent);
  let operatorName = null;
  let slotOutcome = null;

  if (options.crossoverRate > 0 && shouldApply(options.crossoverRate, options.rng)) {
    const mateIndex = selectMateIndex(parents.length, parentIndex, options.rng);
    const mate = mateIndex >= 0 ? parents[mateIndex] : null;
    if (mate) {
      if (logger) {
        logger.debug({ parentIndex, mateIndex }, "evolution: crossover start");
      }
      const crossed = crossoverGenome(parent, mate, {
        operators: options.crossoverOperators,
        rng: options.rng,
      });
      if (crossed) {
        child = crossed;
      }
    }
  }

  if (options.mutationRate > 0 && shouldApply(options.mutationRate, options.rng)) {
    let resolved = false;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (logger) {
        logger.debug({ parentIndex, attempt }, "evolution: mutation attempt start");
      }
      const mutated = mutateAndRepairGenome(child, {
        operators: options.mutationOperators,
        rng: options.rng,
        repairOperators: options.repairOperators,
        selector: options.mutationSelector,
      });
      if (mutated && typeof mutated === "object") {
        operatorName = mutated.operatorName ?? null;
        if (operatorName && options.telemetry) {
          recordAttempt(options.telemetry, operatorName);
        }
        if (mutated.outcome === "noOp") {
          if (operatorName && options.telemetry) {
            recordNoOp(options.telemetry, operatorName);
          }
          slotOutcome = "noOp";
          continue;
        }
        if (mutated.outcome === "repairFailed") {
          if (operatorName && options.telemetry) {
            recordRepairFailed(options.telemetry, operatorName);
          }
          slotOutcome = "repairFailed";
          continue;
        }
        if (mutated.genome) {
          child = mutated.genome;
          slotOutcome = "ok";
          resolved = true;
          break;
        }
      }
    }
    if (!resolved) {
      slotOutcome = slotOutcome ?? "exhausted";
    }
  }

  return { child: cloneGenome(child), operatorName, slotOutcome };
}

export function applyEvolution(population, options) {
  const parents = clonePopulation(population);
  const next = [];
  const operatorNames = [];
  const outcomes = [];
  const logger = options.logger ?? null;
  const maxRetries = Number.isInteger(options.maxMutationRetries) && options.maxMutationRetries >= 0
    ? options.maxMutationRetries
    : 3;
  const offspringPerParent = Number.isInteger(options.offspringPerParent) && options.offspringPerParent >= 1
    ? options.offspringPerParent
    : 1;

  if (logger) {
    logger.info(
      { parentCount: parents.length, offspringPerParent, maxRetries },
      "evolution: starting parent loop",
    );
    logger.flush?.();
  }

  parents.forEach((parent, parentIndex) => {
    for (let offspring = 0; offspring < offspringPerParent; offspring += 1) {
      if (logger) {
        logger.debug({ parentIndex, offspring, genomeId: parent.id }, "evolution: producing offspring");
      }
      const result = produceOffspring(parent, parentIndex, parents, options, maxRetries, logger);
      next.push(result.child);
      operatorNames.push(result.operatorName);
      outcomes.push(result.slotOutcome);
    }
  });

  if (logger) {
    logger.info({ offspringCount: next.length }, "evolution: parent loop complete");
    logger.flush?.();
  }

  return { population: next, operatorNames, outcomes };
}
