# EXTMETREF-006: Add decision-quality integration test

## Goal
Confirm the existing integration test exercises decision-quality sampling, rollouts, and both decision-quality metrics via `computeExtendedMetrics`.

## Status
Completed on 2026-01-28.

## Current state
- `test/integration/decision-quality-metrics.test.mjs` already exists and exercises `computeExtendedMetrics` with real simulation output.
- The integration test already asserts deterministic `choice_value_spread` with a known unit-test value and validates `comeback_potential` bounds.

## Assumptions (revalidated)
- The integration test should reuse the same minimal “meaningful choice” definition used in unit tests.
- Determinism is established via fixed seed and rollout parameters identical to the unit test.

## Tasks
- Verify `test/integration/decision-quality-metrics.test.mjs` continues to use the “meaningful choice” fixture and real simulation output.
- Ensure assertions cover:
  - `choice_value_spread` equals `2`.
  - `comeback_potential` is deterministic and within `[0, 1]`.

## File list (expected to touch)
- test/integration/decision-quality-metrics.test.mjs (only if assertions need adjustment)

## Out of scope
- Changing any decision-quality logic or thresholds.
- Adjusting metric definitions, IDs, or defaults.
- Adding optional skill-expression integration coverage.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/decision-quality-metrics.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Sampling and seed determinism match current behavior.
- `choice_value_spread` and `comeback_potential` output IDs remain unchanged.

## Outcome
- Updated ticket assumptions to reflect the already-present decision-quality integration test.
- No code changes were needed; the existing integration test already satisfies the required assertions.
