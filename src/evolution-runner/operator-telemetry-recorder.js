import { buildOperatorOutcomes } from "./operator-outcomes.js";
import {
  recordOutcome,
  recordEvaluated,
  recordValidEvaluated,
} from "./operator-telemetry.js";

/**
 * Records per-operator telemetry for a completed generation, then notifies
 * the mutation selector so adaptive weights can update.
 *
 * @param {object} params
 * @param {string[]|null} params.pendingOperatorNames  – operator name per genome slot, or null for the first generation
 * @param {object}        params.loopResult            – the generation-loop result
 * @param {object[]}      params.currentPopulation     – population that was evaluated this generation
 * @param {object}        params.telemetry             – mutable telemetry accumulator
 * @param {object|null}   params.mutationSelector      – adaptive selector (may be null)
 */
export function recordGenerationTelemetry({
  pendingOperatorNames,
  loopResult,
  currentPopulation,
  telemetry,
  mutationSelector,
}) {
  if (pendingOperatorNames) {
    const outcomes = buildOperatorOutcomes(loopResult);
    const evaluatedGenomes = new Set(loopResult.evaluated.map((e) => e.genome));
    currentPopulation.forEach((genome, index) => {
      const operatorName = pendingOperatorNames[index];
      if (!operatorName) {
        return;
      }
      const outcome = outcomes.get(genome);
      if (outcome) {
        recordOutcome(telemetry, operatorName, outcome);
        if (evaluatedGenomes.has(genome)) {
          recordEvaluated(telemetry, operatorName);
        }
        if (
          outcome.gridContribution === "filledEmpty" ||
          outcome.gridContribution === "improvedElite"
        ) {
          recordValidEvaluated(telemetry, operatorName);
        }
      }
    });
  }

  if (mutationSelector) {
    mutationSelector.observe(telemetry);
  }
}
