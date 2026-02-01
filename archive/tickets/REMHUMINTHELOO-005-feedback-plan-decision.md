# REMHUMINTHELOO-005: Feedback plan decision function

**Status**: Completed
**Diff size**: M
**Depends on**: 002, 003, 004

## What

New pure function `decideFeedbackPlan()` combining controller state, adaptive budget, calibration schedule, and candidate pool into a per-generation `FeedbackPlan`.

## Files to touch

- `src/evolution-runner/feedback-plan.js` (NEW)
- `test/unit/evolution-runner/feedback-plan.test.mjs` (NEW)

## Out of scope

Wiring into generation-body. Artifact writing. OOD computation.

## Assumption corrections (vs original ticket)

1. **`lastCalibrationGen` not in `ControllerState`**: The controller from ticket 004 stores only `{ mode, stableGenCount }`. Calibration generation tracking (`lastCalibrationGen`) must be passed as a separate input parameter to `decideFeedbackPlan()`, not read from controller state.
2. **Return type scoped to acceptance criteria**: The broader spec (section 1.2) lists `pairSelection` and `candidatePoolResolved` in `FeedbackPlan`, but those are out of scope for this ticket. This ticket's return type is `{ shouldPrompt, budget, reasonCodes }`.
3. **`"high_uncertainty"` reason code**: The adaptive budget module (`computeAdaptiveBudget`) returns `{ budget, unfreezeRequired }` — it does not emit reason codes. The feedback plan function infers `"high_uncertainty"` when the adaptive budget exceeds the base budget (indicating scale-up occurred).
4. **`"learning"` reason code**: Added to indicate normal learning-mode operation (not frozen, not calibration).

## Acceptance criteria

- Tests: frozen + not calibration gen = `{ shouldPrompt: false, budget: 0 }`
- Tests: frozen + calibration due = `{ shouldPrompt: true, budget: calibration.samples }`
- Tests: learning mode uses adaptive budget result
- Tests: calibration scheduled exactly every `everyGens` from `lastCalibrationGen`
- Tests: `reasonCodes` includes `"frozen"`, `"calibration_due"`, `"high_uncertainty"` as appropriate
- Tests: deterministic given seed
- Invariant: pure function
- Invariant: `tsc -p tsconfig.json` passes

## Outcome

**What changed vs originally planned:**

The implementation matches the acceptance criteria with these deviations from the original ticket text:

- **Input shape**: `decideFeedbackPlan()` takes `{ controllerState, calibration, generation, lastCalibrationGen, adaptiveBudgetResult, baseMaxPerGen }` instead of a monolithic `ctx`. `lastCalibrationGen` is a standalone parameter (not part of controller state) and `adaptiveBudgetResult` is pre-computed by the caller (keeping this function pure without importing `computeAdaptiveBudget`).
- **Return shape**: `{ shouldPrompt, budget, reasonCodes }` only — `pairSelection` and `candidatePoolResolved` deferred to wiring ticket.
- **Calibration scheduling**: Implemented inline via `isCalibrationDue()` helper (no separate module) since the logic is a simple offset comparison.
- **18 tests across 5 suites**: frozen mode (3), learning mode (5), calibration scheduling (5), determinism (2), edge cases (3).
- **`tsc` passes** with zero errors.
