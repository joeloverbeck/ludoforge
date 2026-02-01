/**
 * Pure state-transition function for the preference-learning
 * freeze / unfreeze lifecycle.
 *
 * No I/O — deterministic given identical inputs.
 *
 * @module evolution-runner/preference-controller
 */

/**
 * @typedef {"learning" | "frozen"} ControllerMode
 *
 * @typedef {object} ControllerState
 * @property {ControllerMode} mode
 * @property {number} stableGenCount
 *
 * @typedef {object} FreezeConfig
 * @property {boolean} enabled
 * @property {number} minTotalSamples
 * @property {number} freezeAfterStableGens
 * @property {number} stableUncertaintyThreshold
 * @property {boolean} requireNoNewMetricIds
 *
 * @typedef {object} DriftConfig
 * @property {boolean} enabled
 * @property {number} unfreezeUncertaintyThreshold
 * @property {number} minCalibrationAccuracy
 * @property {{ enabled: boolean, maxOodRate: number }} ood
 *
 * @typedef {object} AdvanceInput
 * @property {ControllerState} state
 * @property {FreezeConfig} freeze
 * @property {DriftConfig} drift
 * @property {number} totalSamples
 * @property {number} meanUncertainty
 * @property {boolean} hasNewMetricIds
 * @property {number|null} [oodRate]
 * @property {number|null} [calibrationAccuracy]
 *
 * @typedef {object} AdvanceResult
 * @property {ControllerState} nextState
 * @property {boolean} froze
 * @property {boolean} unfroze
 * @property {string[]} reasonCodes
 */

/**
 * Create the initial controller state for generation 0.
 *
 * @returns {ControllerState}
 */
export function createInitialControllerState() {
  return {
    mode: "learning",
    stableGenCount: 0,
  };
}

/**
 * Determine whether an unfreeze trigger has fired.
 *
 * @param {DriftConfig} drift
 * @param {number} meanUncertainty
 * @param {number|null|undefined} oodRate
 * @param {number|null|undefined} calibrationAccuracy
 * @returns {string[]} reason codes that fired
 */
function checkUnfreezeTriggers(drift, meanUncertainty, oodRate, calibrationAccuracy) {
  const reasons = [];

  if (!drift.enabled) {
    return reasons;
  }

  if (
    Number.isFinite(meanUncertainty) &&
    meanUncertainty >= drift.unfreezeUncertaintyThreshold
  ) {
    reasons.push("uncertainty_spike");
  }

  if (
    drift.ood &&
    drift.ood.enabled &&
    Number.isFinite(oodRate) &&
    oodRate > drift.ood.maxOodRate
  ) {
    reasons.push("ood_rate_spike");
  }

  if (
    Number.isFinite(calibrationAccuracy) &&
    calibrationAccuracy < drift.minCalibrationAccuracy
  ) {
    reasons.push("calibration_accuracy_drop");
  }

  return reasons;
}

/**
 * Determine whether freeze conditions are satisfied.
 *
 * @param {FreezeConfig} freeze
 * @param {number} totalSamples
 * @param {number} stableGenCount
 * @param {number} meanUncertainty
 * @param {boolean} hasNewMetricIds
 * @returns {{ canFreeze: boolean, reasonCodes: string[] }}
 */
function checkFreezeConditions(freeze, totalSamples, stableGenCount, meanUncertainty, hasNewMetricIds) {
  if (!freeze.enabled) {
    return { canFreeze: false, reasonCodes: ["freeze_disabled"] };
  }

  if (totalSamples < freeze.minTotalSamples) {
    return { canFreeze: false, reasonCodes: ["insufficient_samples"] };
  }

  if (freeze.requireNoNewMetricIds && hasNewMetricIds) {
    return { canFreeze: false, reasonCodes: ["new_metric_ids"] };
  }

  const isStable =
    Number.isFinite(meanUncertainty) &&
    meanUncertainty < freeze.stableUncertaintyThreshold;

  const nextStableCount = isStable ? stableGenCount + 1 : 0;

  if (nextStableCount < freeze.freezeAfterStableGens) {
    return { canFreeze: false, reasonCodes: ["not_stable_long_enough"] };
  }

  return { canFreeze: true, reasonCodes: ["stable"] };
}

/**
 * Advance the controller by one generation.
 *
 * Pure function — deterministic given identical inputs.
 *
 * @param {AdvanceInput} input
 * @returns {AdvanceResult}
 */
export function advanceController({
  state,
  freeze,
  drift,
  totalSamples,
  meanUncertainty,
  hasNewMetricIds,
  oodRate = null,
  calibrationAccuracy = null,
}) {
  if (state.mode === "frozen") {
    const unfreezeReasons = checkUnfreezeTriggers(
      drift,
      meanUncertainty,
      oodRate,
      calibrationAccuracy,
    );

    if (unfreezeReasons.length > 0) {
      return {
        nextState: { mode: "learning", stableGenCount: 0 },
        froze: false,
        unfroze: true,
        reasonCodes: unfreezeReasons,
      };
    }

    return {
      nextState: { ...state },
      froze: false,
      unfroze: false,
      reasonCodes: ["frozen"],
    };
  }

  // mode === "learning"
  const { canFreeze, reasonCodes: freezeReasons } = checkFreezeConditions(
    freeze,
    totalSamples,
    state.stableGenCount,
    meanUncertainty,
    hasNewMetricIds,
  );

  if (canFreeze) {
    return {
      nextState: { mode: "frozen", stableGenCount: state.stableGenCount + 1 },
      froze: true,
      unfroze: false,
      reasonCodes: ["freeze_triggered"],
    };
  }

  // Stay learning — update stableGenCount
  const isStable =
    Number.isFinite(meanUncertainty) &&
    meanUncertainty < freeze.stableUncertaintyThreshold;

  const nextStableCount = isStable ? state.stableGenCount + 1 : 0;

  return {
    nextState: { mode: "learning", stableGenCount: nextStableCount },
    froze: false,
    unfroze: false,
    reasonCodes: freezeReasons,
  };
}
