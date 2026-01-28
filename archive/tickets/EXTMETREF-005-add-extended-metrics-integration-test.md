# EXTMETREF-005: Add extended metrics end-to-end integration test

## Goal
Confirm the existing integration test exercises coverage, length, and outcome variance metrics through `computeExtendedMetrics`, and align its assertions with the current implementation.

## Status
Completed on 2026-01-28.

## Current state
- `test/integration/extended-metrics.test.mjs` already exists and uses real simulation output adapted via `adaptSimulationLog`.
- `computeExtendedMetrics` already lives in `src/evaluation-analytics/metrics/extended/aggregation.js` and is re-exported from `src/evaluation-analytics/metrics/extended.js`.

## Assumptions (revalidated)
- The integration test should use real simulation outputs rather than hand-crafted summaries.
- The deterministic metric values are derived from a minimal win/lose definition without additional scoring rules.

## Tasks
- Verify `test/integration/extended-metrics.test.mjs` covers the required metrics using real simulation outputs.
- Ensure the test asserts deterministic values for:
  - `length_mean`, `length_variance`, `early_termination_rate`
  - `outcome_variance`, `coverage_actions`, `coverage_state`

## File list (expected to touch)
- test/integration/extended-metrics.test.mjs (only if assertions need adjustment)

## Out of scope
- Changes to metric definitions or default parameters.
- Any refactors outside the extended metrics module.
- Adding new public APIs.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/extended-metrics.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Metric IDs remain unchanged.
- Deterministic metrics remain deterministic for identical inputs.
- The integration test uses real simulation outputs (not hand-crafted summaries) unless a required helper already exists.

## Outcome
- Updated ticket assumptions to reflect the already-present integration test and existing metrics refactor layout.
- No code changes were needed; the existing integration test already asserts the required deterministic metrics.
