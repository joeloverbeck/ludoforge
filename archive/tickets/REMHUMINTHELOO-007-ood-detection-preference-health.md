# REMHUMINTHELOO-007: OOD detection and preference health

**Status**: Completed
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

- Tests: `computeOodRate` returns rate in [0,1] for cosine distance ✅
- Tests: `computeOodRate` returns rate in [0,1] for L2 distance ✅
- Tests: p95 threshold computation correct ✅
- Tests: empty candidates returns oodRate=0 ✅
- Tests: `updateTrainFeatureStats` accumulates vectors correctly ✅
- Tests: `buildPreferenceHealth` returns all fields from spec ✅
- Invariant: pure functions ✅
- Invariant: `tsc -p tsconfig.json` passes ✅

## Outcome

### What was actually changed

Created 4 new files exactly as planned. No existing files were modified.

**`src/evaluation-analytics/ood-detection.js`** — Pure functions for OOD detection:
- `cosineDistance(a, b)` — cosine distance between two feature vectors
- `l2Distance(a, b)` — Euclidean distance between two feature vectors
- `updateTrainFeatureStats(prev, newVectors, options)` — accumulates training feature vectors and computes p95 distance threshold (supports both cosine and L2, caps stored vectors at configurable max)
- `computeOodRate(trainStats, candidates, options)` — computes fraction of candidates exceeding the p95 threshold

**`src/evolution-runner/preference-health.js`** — Pure builder for the per-generation diagnostic artifact:
- `buildPreferenceHealth(input)` — returns all 7 fields from spec §1.5 (`meanUncertainty`, `oodRate`, `controllerMode`, `stableGenCount`, `plannedBudget`, `didPrompt`, `metricIdDeltaDetected`) with sanitization for non-finite numbers and boolean coercion

**Tests (38 total, all passing):**
- `test/unit/evaluation-analytics/ood-detection.test.mjs` — 26 tests across 4 suites (cosineDistance, l2Distance, updateTrainFeatureStats, computeOodRate)
- `test/unit/evolution-runner/preference-health.test.mjs` — 12 tests covering field completeness, value preservation, sanitization, purity, immutability, JSON serializability

### Deviation from plan

None. The ticket's assumptions about the codebase were correct — no existing OOD detection or preference health code existed. Distance utilities (cosine, L2) were added inside the new ood-detection module rather than in the existing `feature-vector-math.js`, keeping the scope minimal and avoiding changes to existing files.
