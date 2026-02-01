# REMHUMINTHELOO-007: OOD detection and preference health

**Status**: Open
**Diff size**: M
**Depends on**: none

## What

New functions for out-of-distribution detection (`computeOodRate`, `updateTrainFeatureStats`) and the `buildPreferenceHealth` diagnostic object.

## Files to touch

- `src/evaluation-analytics/ood-detection.js` (NEW)
- `src/evolution-runner/preference-health.js` (NEW)
- `test/unit/evaluation-analytics/ood-detection.test.mjs` (NEW)
- `test/unit/evolution-runner/preference-health.test.mjs` (NEW)

## Out of scope

Wiring into generation body. Controller transitions.

## Acceptance criteria

- Tests: `computeOodRate` returns rate in [0,1] for cosine distance
- Tests: `computeOodRate` returns rate in [0,1] for L2 distance
- Tests: p95 threshold computation correct
- Tests: empty candidates returns oodRate=0
- Tests: `updateTrainFeatureStats` accumulates vectors correctly
- Tests: `buildPreferenceHealth` returns all fields from spec
- Invariant: pure functions
- Invariant: `tsc -p tsconfig.json` passes
