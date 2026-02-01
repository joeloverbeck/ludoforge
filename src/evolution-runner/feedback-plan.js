/**
 * Pure decision function that combines controller state, adaptive budget,
 * and calibration schedule into a per-generation feedback plan.
 *
 * No I/O — deterministic given identical inputs.
 *
 * @module evolution-runner/feedback-plan
 */

/**
 * @typedef {import("./preference-controller.js").ControllerState} ControllerState
 *
 * @typedef {object} CalibrationConfig
 * @property {boolean} enabled
 * @property {number} everyGens
 * @property {number} samples
 *
 * @typedef {object} FeedbackPlanInput
 * @property {ControllerState} controllerState
 * @property {CalibrationConfig} calibration
 * @property {number} generation          - current generation index (0-based)
 * @property {number|null} lastCalibrationGen - generation of last calibration, or null if none
 * @property {{ budget: number, unfreezeRequired: boolean }} adaptiveBudgetResult
 * @property {number} baseMaxPerGen       - the configured base max samples per generation
 *
 * @typedef {object} FeedbackPlan
 * @property {boolean} shouldPrompt
 * @property {number} budget
 * @property {string[]} reasonCodes
 */

/**
 * Determine whether a calibration probe is due this generation.
 *
 * @param {CalibrationConfig} calibration
 * @param {number} generation
 * @param {number|null} lastCalibrationGen
 * @returns {boolean}
 */
function isCalibrationDue(calibration, generation, lastCalibrationGen) {
  if (!calibration.enabled) {
    return false;
  }
  if (lastCalibrationGen === null || !Number.isFinite(lastCalibrationGen)) {
    return generation >= calibration.everyGens;
  }
  return generation - lastCalibrationGen >= calibration.everyGens;
}

/**
 * Decide the feedback plan for one generation.
 *
 * Pure function — deterministic given identical inputs.
 *
 * @param {FeedbackPlanInput} input
 * @returns {FeedbackPlan}
 */
export function decideFeedbackPlan({
  controllerState,
  calibration,
  generation,
  lastCalibrationGen,
  adaptiveBudgetResult,
  baseMaxPerGen,
}) {
  const calibrationDue = isCalibrationDue(calibration, generation, lastCalibrationGen);

  if (controllerState.mode === "frozen") {
    if (calibrationDue) {
      return {
        shouldPrompt: true,
        budget: calibration.samples,
        reasonCodes: ["frozen", "calibration_due"],
      };
    }
    return {
      shouldPrompt: false,
      budget: 0,
      reasonCodes: ["frozen"],
    };
  }

  // mode === "learning"
  const { budget } = adaptiveBudgetResult;
  const reasonCodes = ["learning"];

  if (calibrationDue) {
    reasonCodes.push("calibration_due");
  }

  if (budget > baseMaxPerGen) {
    reasonCodes.push("high_uncertainty");
  }

  return {
    shouldPrompt: budget > 0,
    budget,
    reasonCodes,
  };
}
