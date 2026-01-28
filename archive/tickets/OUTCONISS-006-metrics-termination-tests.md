# OUTCONISS-006 Metrics Termination Tests

## Context
Metrics logic refers to terminated and terminationReason. Add/adjust unit tests so early termination rate and non-terminating degeneracy calculations align with the canonical contract in specs/output-contract-issues.md.

## Assumptions (reassessed)
- Early termination rate coverage lives in extended metrics tests, not core metrics.
- Non-terminating degeneracy should treat cutoff reasons (max-turns, max-steps, loop-detected) the same as terminated=false.

## Scope
- Update or add tests for early termination rate to use terminationReason and terminated.
- Update or add tests for non-terminating degeneracy to trigger on cutoff reasons (max-turns, max-steps, loop-detected) or terminated=false.

## File list
- test/unit/evaluation-analytics/extended-metrics.test.mjs
- test/unit/evaluation-analytics/degeneracy.test.mjs

## Out of scope
- No documentation changes.
- No changes to simulation engine tests or fixtures unless needed for metrics inputs.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/extended-metrics.test.mjs`
- `node --test test/unit/evaluation-analytics/degeneracy.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Metric outputs are unchanged for terminal outcomes; only cutoff handling changes to rely on terminated/terminationReason.
- No metrics depend on outcome.reason.

## Status
Completed (2026-01-28)

## Outcome
- Updated early termination rate tests in extended metrics (not core metrics).
- Expanded non-terminating degeneracy handling to include max-steps and loop-detected cutoffs.
