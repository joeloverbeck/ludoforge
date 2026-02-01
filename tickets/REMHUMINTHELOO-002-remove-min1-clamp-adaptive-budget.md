# REMHUMINTHELOO-002: Remove min=1 clamp from adaptive budget

**Status**: Open
**Diff size**: S
**Depends on**: 001

## What

In `computeAdaptiveBudget()`, remove every `Math.max(1, ...)`. Allow `baseMaxPerGen=0` to produce budget `0`. Accept `scaleDownFactor`, `scaleUpFactor`, `onNewMetricIds` as parameters. Return `{ budget, unfreezeRequired }` object (or add `unfreezeRequired` field).

## Files to touch

- `src/evolution-runner/adaptive-budget.js` — remove `Math.max(1, base)` in `normalizeBaseMaxSamples`; remove `Math.max(1, ...)` on all return lines; add `scaleDownFactor`/`scaleUpFactor`/`onNewMetricIds` params
- `test/unit/evolution-runner/adaptive-budget.test.mjs` — update "never drops below 1" test to expect 0; add tests for budget=0, custom scale factors, `onNewMetricIds="forceUnfreeze"`

## Out of scope

Controller logic. Candidate pool. Integration into runner.

## Acceptance criteria

- Tests: `computeAdaptiveBudget({ baseMaxSamples: 0, enabled: true })` returns 0
- Tests: low uncertainty with baseMaxSamples=1 and scaleDownFactor=0.5 returns 0
- Tests: custom scaleUpFactor honored
- Tests: `onNewMetricIds="forceUnfreeze"` signals unfreeze
- Invariant: function remains pure (no side effects)
- Invariant: `tsc -p tsconfig.json` passes
