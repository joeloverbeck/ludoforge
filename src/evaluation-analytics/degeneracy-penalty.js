import {
  DEFAULT_DEGENERACY_CONFIG,
  DEFAULT_DEGENERACY_FILTERS,
} from "./degeneracy-config.js";

function applyDegeneracyFilters(report, options = {}) {
  const rejectFlags = options.rejectFlags ?? DEFAULT_DEGENERACY_FILTERS.rejectFlags;
  const rejectSet = new Set(rejectFlags);
  const flags = report?.flags ?? [];
  const rejectedFlags = flags.filter((flag) => rejectSet.has(flag));

  if (rejectedFlags.length > 0) {
    return { allow: false, rejectedFlags };
  }

  const compoundRejection =
    options.compoundRejection ?? DEFAULT_DEGENERACY_CONFIG.compoundRejection;
  if (compoundRejection?.enabled) {
    const policyByFlag =
      options.policyByFlag ?? DEFAULT_DEGENERACY_CONFIG.policyByFlag ?? {};
    const penaltyFlags = flags.filter(
      (flag) => policyByFlag[flag] === "penalize"
    );
    const maxPenaltyFlags = compoundRejection.maxPenaltyFlags ?? 3;
    if (penaltyFlags.length > maxPenaltyFlags) {
      return {
        allow: false,
        rejectedFlags: penaltyFlags,
        compoundRejection: true,
      };
    }
  }

  return { allow: true, rejectedFlags: [] };
}

function computeDegeneracyPenalty(report, penaltyConfig) {
  const config = penaltyConfig ?? DEFAULT_DEGENERACY_CONFIG;
  const policyByFlag = config?.policyByFlag ?? {};
  const penalties = config?.penalties ?? {};
  const flagSet = new Set(report?.flags ?? []);

  let total = 0;

  for (const [flag, policy] of Object.entries(policyByFlag)) {
    if (policy !== "penalize" || !flagSet.has(flag)) {
      continue;
    }
    const penaltyDef = penalties[flag];
    if (!penaltyDef || !Number.isFinite(penaltyDef.weight)) {
      continue;
    }
    if (flag === "forced-move") {
      const ratio = report?.ratios?.["forced-move"] ?? 0;
      const freeRatio = Number.isFinite(penaltyDef.freeRatio) ? penaltyDef.freeRatio : 0;
      total += Math.max(0, ratio - freeRatio) * penaltyDef.weight;
    } else {
      total += penaltyDef.weight;
    }
  }

  return Math.max(0, total);
}

export { applyDegeneracyFilters, computeDegeneracyPenalty };
