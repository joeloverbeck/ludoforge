# REMHUMINTHELOO-004: Preference controller state machine

**Status**: Open
**Diff size**: M
**Depends on**: none

## What

New pure state-transition function for freeze/unfreeze lifecycle. `createInitialControllerState()` and `advanceController()` returning `{ nextState, froze, unfroze, reasonCodes }`.

## Files to touch

- `src/evolution-runner/preference-controller.js` (NEW)
- `test/unit/evolution-runner/preference-controller.test.mjs` (NEW)

## Out of scope

Feedback plan decision. Artifact writing. OOD computation. Taste vector.

## Acceptance criteria

- Tests: freeze only when `totalSamples >= minTotalSamples` AND `stableGenCount >= freezeAfterStableGens` AND uncertainty below threshold
- Tests: freeze blocked by new metric IDs when `requireNoNewMetricIds=true`
- Tests: unfreeze on uncertainty >= `unfreezeUncertaintyThreshold`
- Tests: unfreeze on `oodRate > maxOodRate`
- Tests: unfreeze on `calibrationAccuracy < minCalibrationAccuracy`
- Tests: `stableGenCount` resets on unfreeze
- Tests: no freeze when `freeze.enabled=false`
- Invariant: deterministic given identical inputs
- Invariant: `tsc -p tsconfig.json` passes
