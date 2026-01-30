import { crossoverGenome } from "../evolutionary-engine/crossover.js";
import { mutateAndRepairGenome } from "../evolutionary-engine/mutation.js";
import { cloneGenome, clonePopulation, selectMateIndex } from "./population-utils.js";
import { shouldApply } from "./evolution-rates.js";
import { recordAttempt } from "./operator-telemetry.js";

export function applyEvolution(population, options) {
  const parents = clonePopulation(population);
  const next = [];
  const operatorNames = new Array(parents.length).fill(null);

  parents.forEach((parent, index) => {
    let child = cloneGenome(parent);
    let operatorName = null;

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
      const mutated = mutateAndRepairGenome(child, {
        operators: options.mutationOperators,
        rng: options.rng,
        repairOperators: options.repairOperators,
        selector: options.mutationSelector ?? undefined,
      });
      if (options.mutationSelector && mutated && typeof mutated === "object") {
        operatorName = mutated.operatorName ?? null;
        if (mutated.genome) {
          child = mutated.genome;
        }
      } else if (mutated) {
        child = mutated;
      }
      if (operatorName && options.telemetry) {
        recordAttempt(options.telemetry, operatorName);
      }
    }

    next.push(cloneGenome(child));
    operatorNames[index] = operatorName;
  });

  return { population: next, operatorNames };
}
