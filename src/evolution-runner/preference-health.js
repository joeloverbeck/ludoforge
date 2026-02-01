/**
 * Build the per-generation preference-health diagnostic object.
 *
 * Pure function — no I/O, deterministic given identical inputs.
 *
 * @module evolution-runner/preference-health
 */

/**
 * @typedef {object} PreferenceHealthInput
 * @property {number}  meanUncertainty        Mean ensemble uncertainty over candidate pool.
 * @property {number}  oodRate                OOD rate over candidate pool (0 if not computed).
 * @property {"learning" | "frozen"} controllerMode  Current controller mode.
 * @property {number}  stableGenCount         Consecutive stable generations.
 * @property {number}  plannedBudget          Feedback budget decided for this generation.
 * @property {boolean} didPrompt              Whether feedback was actually collected.
 * @property {boolean} metricIdDeltaDetected  Whether new metric IDs appeared.
 *
 * @typedef {object} PreferenceHealth
 * @property {number}  meanUncertainty
 * @property {number}  oodRate
 * @property {string}  controllerMode
 * @property {number}  stableGenCount
 * @property {number}  plannedBudget
 * @property {boolean} didPrompt
 * @property {boolean} metricIdDeltaDetected
 */

/**
 * Assemble the preference-health diagnostic artifact.
 *
 * All fields come from spec §1.5.  Returns a plain object safe for
 * JSON serialization.
 *
 * @param {PreferenceHealthInput} input
 * @returns {PreferenceHealth}
 */
export function buildPreferenceHealth({
  meanUncertainty,
  oodRate,
  controllerMode,
  stableGenCount,
  plannedBudget,
  didPrompt,
  metricIdDeltaDetected,
}) {
  return {
    meanUncertainty: sanitizeNumber(meanUncertainty),
    oodRate: sanitizeNumber(oodRate),
    controllerMode: controllerMode === "frozen" ? "frozen" : "learning",
    stableGenCount: sanitizeNumber(stableGenCount),
    plannedBudget: sanitizeNumber(plannedBudget),
    didPrompt: Boolean(didPrompt),
    metricIdDeltaDetected: Boolean(metricIdDeltaDetected),
  };
}

/** @param {unknown} v @returns {number} */
function sanitizeNumber(v) {
  return Number.isFinite(v) ? /** @type {number} */ (v) : 0;
}
