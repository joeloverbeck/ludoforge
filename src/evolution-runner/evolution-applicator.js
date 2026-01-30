import { crossoverGenome } from "../evolutionary-engine/crossover.js";
import { mutateAndRepairGenome } from "../evolutionary-engine/mutation.js";
import { cloneGenome, clonePopulation, selectMateIndex } from "./population-utils.js";
import { shouldApply } from "./evolution-rates.js";
import { recordAttempt, recordNoOp, recordRepairFailed } from "./operator-telemetry.js";

export function applyEvolution(population, options) {
  const parents = clonePopulation(population);
  const next = [];
  const operatorNames = new Array(parents.length).fill(null);
  const outcomes = new Array(parents.length).fill(null);
  const maxRetries = Number.isInteger(options.maxMutationRetries) && options.maxMutationRetries >= 0
    ? options.maxMutationRetries
    : 3;

  parents.forEach((parent, index) => {
    let child = cloneGenome(parent);
    let operatorName = null;
    let slotOutcome = null;

    if (options.crossoverRate > 0 && shouldApply(options.crossoverRate, options.rng)) {
      const mateIndex = selectMateIndex(parents.length, index, options.rng);
      const mate = mateIndex >= 0 ? parents[mateIndex] : null;
      if (mate) {
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
      if (options.mutationSelector) {
        let resolved = false;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
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
      } else {
        const mutated = mutateAndRepairGenome(child, {
          operators: options.mutationOperators,
          rng: options.rng,
          repairOperators: options.repairOperators,
        });
        if (mutated) {
          child = mutated;
          slotOutcome = "ok";
        }
      }
    }

    next.push(cloneGenome(child));
    operatorNames[index] = operatorName;
    outcomes[index] = slotOutcome;
  });

  return { population: next, operatorNames, outcomes };
}
