# EXTMETREF-007: Add skill-expression integration test

## Goal
Add an integration test that verifies `skill_expression` metric gating from the top-level `computeExtendedMetrics` path.

## Assumptions (reassessed)
- `computeExtendedMetrics` already gates `skill_expression` inside `src/evaluation-analytics/metrics/extended/aggregation.js`.
- `src/evaluation-analytics/metrics/extended.js` already re-exports the extended metrics entry point.
- A unit test already covers gating without summaries; this ticket adds an integration test that exercises the log adapter + summaries path.

## Tasks
- Create `test/integration/skill-expression-metric.test.mjs`.
- Build a minimal two-player definition and run a small simulation to produce summaries.
- Call `computeExtendedMetrics` twice: once with `skillExpression.enabled` true and once false.
- Assert presence/absence of `skill_expression` accordingly.

## File list (expected to touch)
- test/integration/skill-expression-metric.test.mjs

## Out of scope
- Changing skill-expression metric logic or thresholds.
- Refactoring other extended metrics.
- Adding new public APIs.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/skill-expression-metric.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Metric IDs remain unchanged.
- Gating behavior only depends on the `skillExpression.enabled` option.
- Existing behavior for all other metrics is unchanged.

## Status
Completed (2026-01-28)

## Outcome
- Added integration coverage for `skill_expression` gating via the log adapter + summaries path.
- No production code changes were needed beyond the new integration test.
