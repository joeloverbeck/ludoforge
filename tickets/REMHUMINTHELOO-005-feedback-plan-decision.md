# REMHUMINTHELOO-005: Feedback plan decision function

**Status**: Open
**Diff size**: M
**Depends on**: 002, 003, 004

## What

New pure function `decideFeedbackPlan()` combining controller state, adaptive budget, calibration schedule, and candidate pool into a per-generation `FeedbackPlan`.

## Files to touch

- `src/evolution-runner/feedback-plan.js` (NEW)
- `test/unit/evolution-runner/feedback-plan.test.mjs` (NEW)

## Out of scope

Wiring into generation-body. Artifact writing. OOD computation.

## Acceptance criteria

- Tests: frozen + not calibration gen = `{ shouldPrompt: false, budget: 0 }`
- Tests: frozen + calibration due = `{ shouldPrompt: true, budget: calibration.samples }`
- Tests: learning mode uses adaptive budget result
- Tests: calibration scheduled exactly every `everyGens` from `lastCalibrationGen`
- Tests: `reasonCodes` includes `"frozen"`, `"calibration_due"`, `"high_uncertainty"` as appropriate
- Tests: deterministic given seed
- Invariant: pure function
- Invariant: `tsc -p tsconfig.json` passes
