import { DEFAULT_FEATURE_ORDER } from "../evaluation-analytics/feature-vector.js";

/**
 * Validates that all descriptor IDs from the MAP-Elites config are
 * recognised metric names that the evaluator can produce.
 *
 * @param {string[]} descriptorIds - IDs from config.mapElites.descriptors
 * @param {string[]} [availableMetrics] - Override for known metric names
 * @returns {{ valid: boolean, unknownIds: string[], availableMetrics: string[] }}
 */
export function validateDescriptorKeys(
  descriptorIds,
  availableMetrics = DEFAULT_FEATURE_ORDER,
) {
  const known = new Set(availableMetrics);
  const unknownIds = descriptorIds.filter((id) => !known.has(id));
  return {
    valid: unknownIds.length === 0,
    unknownIds,
    availableMetrics: [...availableMetrics],
  };
}
