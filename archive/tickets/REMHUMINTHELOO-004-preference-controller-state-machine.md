# REMHUMINTHELOO-004: Preference controller state machine

**Status**: Completed
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

## Outcome

**All acceptance criteria met as originally planned. No discrepancies found in the ticket.**

### What was changed

Created two new files exactly as scoped:

1. **`src/evolution-runner/preference-controller.js`** — Pure state-transition module exporting:
   - `createInitialControllerState()` → `{ mode: "learning", stableGenCount: 0 }`
   - `advanceController({ state, freeze, drift, totalSamples, meanUncertainty, hasNewMetricIds, oodRate, calibrationAccuracy })` → `{ nextState, froze, unfroze, reasonCodes }`

2. **`test/unit/evolution-runner/preference-controller.test.mjs`** — 26 tests across 5 suites covering all acceptance criteria plus boundary/edge cases.

### Deviations from plan

None. The ticket's assumptions were accurate — no existing files conflicted, the API shape matched, and no corrections were needed.
