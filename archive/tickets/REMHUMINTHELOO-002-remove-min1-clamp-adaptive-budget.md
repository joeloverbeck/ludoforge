# REMHUMINTHELOO-002: Remove min=1 clamp from adaptive budget

**Status**: Completed
**Diff size**: S
**Depends on**: 001

## What

In `computeAdaptiveBudget()`, remove every `Math.max(1, ...)`. Allow `baseMaxSamples=0` to produce budget `0`. Accept `scaleDownFactor`, `scaleUpFactor`, `onNewMetricIds` as optional parameters (defaulting to current hardcoded values). Return `{ budget, unfreezeRequired }` object instead of a plain number.

## Assumptions corrected during implementation

1. **Return type change is a breaking API change.** The function is called in `src/human-interface/create-feedback-provider.js:128` where the result is assigned directly as a number, and in `test/e2e/adaptive-human-budget.e2e.test.mjs` where it is also used as a number. Both callers must be updated to destructure `{ budget }` from the result.
2. **`onNewMetricIds="forceUnfreeze"` produces `unfreezeRequired: true`** in the returned object. The default behavior (`onNewMetricIds="scaleUp"` or unset) preserves the existing scale-up behavior with `unfreezeRequired: false`. This is a signal only — the controller (out of scope) will act on it later.
3. **`normalizeBaseMaxSamples` currently floors non-finite values to 1 then clamps via `Math.max(1, ...)`**. After the change, non-finite values floor to 0, and no min-1 clamp is applied.

## Files to touch

- `src/evolution-runner/adaptive-budget.js` — remove `Math.max(1, base)` in `normalizeBaseMaxSamples`; remove `Math.max(1, ...)` on all return lines; add `scaleDownFactor`/`scaleUpFactor`/`onNewMetricIds` params; return `{ budget, unfreezeRequired }` object
- `src/human-interface/create-feedback-provider.js` — destructure `{ budget }` from `computeAdaptiveBudget()` return value
- `test/unit/evolution-runner/adaptive-budget.test.mjs` — update all tests to expect `{ budget, unfreezeRequired }` objects; update "never drops below 1" test to expect budget 0; add tests for budget=0, custom scale factors, `onNewMetricIds="forceUnfreeze"`
- `test/e2e/adaptive-human-budget.e2e.test.mjs` — destructure `{ budget }` from `computeAdaptiveBudget()` return value

## Out of scope

Controller logic. Candidate pool. Integration into runner.

## Acceptance criteria

- Tests: `computeAdaptiveBudget({ baseMaxSamples: 0, enabled: true })` returns `{ budget: 0, unfreezeRequired: false }`
- Tests: low uncertainty with baseMaxSamples=1 and scaleDownFactor=0.5 returns `{ budget: 0, unfreezeRequired: false }`
- Tests: custom scaleUpFactor honored
- Tests: `onNewMetricIds="forceUnfreeze"` returns `{ budget: <scaled>, unfreezeRequired: true }`
- Tests: `onNewMetricIds="scaleUp"` (default) returns `{ budget: <scaled>, unfreezeRequired: false }`
- Callers updated to destructure the new return type
- Invariant: function remains pure (no side effects)
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: all unit, e2e tests pass

## Outcome

**Changed vs originally planned:**

The original ticket assumed the return type change was trivial and didn't list callers. In practice, two callers needed updating:
- `src/human-interface/create-feedback-provider.js` — destructured `{ budget: maxSamplesPerGen }` from the new return type
- `test/e2e/adaptive-human-budget.e2e.test.mjs` — same destructuring fix

The ticket also initially omitted the `unfreezeRequired` field's interaction with `onNewMetricIds` — both `"scaleUp"` (default, preserves existing behavior) and `"forceUnfreeze"` (signals controller) are now supported.

**Actual changes:**
1. `src/evolution-runner/adaptive-budget.js` — removed all `Math.max(1, ...)` clamps; added `scaleDownFactor`, `scaleUpFactor`, `onNewMetricIds` optional params; changed return type from `number` to `{ budget, unfreezeRequired }`; non-finite `baseMaxSamples` now defaults to 0 instead of 1
2. `src/human-interface/create-feedback-provider.js` — destructured return value
3. `test/unit/evolution-runner/adaptive-budget.test.mjs` — rewrote 5 existing tests for new return type; added 8 new tests (budget=0, custom scale factors, forceUnfreeze, scaleUp, NaN default)
4. `test/e2e/adaptive-human-budget.e2e.test.mjs` — destructured return value

All 13 unit tests and 1 E2E test pass. `tsc` passes.
