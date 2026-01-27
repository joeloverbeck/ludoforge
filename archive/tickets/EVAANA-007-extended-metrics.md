# [EVAANA] EVAANA-007: Implement extended/optional metrics
Status: Completed (2026-01-27)

## Goal
Add the optional/extended metrics from the spec to broaden analytics coverage.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended.d.ts
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/extended-metrics.test.mjs

## Scope
- Implement metrics:
  - Length distribution: `length_mean`, `length_variance` (population variance over step counts), `early_termination_rate` (fraction of summaries with termination reasons other than `condition`, or `terminated === false`).
  - Balance: `balance_skew` (max/min win-rate gap by seat/player id; draw counts as 0.5).
  - Coverage: `coverage_actions` (distinct actionIds observed / definition.actions.length) and `coverage_state` (proxy for state exploration as average uniqueStateCount/stepCount across summaries with both fields).
- Keep extended metrics opt-in via explicit function calls.
- Use the same output conventions as core metrics in `src/evaluation-analytics/types.ts` (MetricResults). Coverage metrics accept the game definition to compare observed actions against defined actions.

## Out of scope
- No changes to core metrics.
- No scoring/weighting changes.
- No degeneracy filtering changes.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/evaluation-analytics/extended-metrics.test.mjs`

### Invariants that must remain true
- Extended metrics are deterministic and side-effect free.
- Extended metrics do not alter existing metric outputs.
- Existing test suites remain green.

## Notes
- Repository runtime modules are `.js` with matching `.d.ts` where type hints are needed; follow that pattern for the new metrics module.
- Coverage uses available log adapter summaries (actionCounts, uniqueStateCount) as proxies rather than adding new simulation hooks.

## Outcome
- Added an extended metrics module with length, balance, and coverage helpers plus a bundled `computeExtendedMetrics` export.
- Updated evaluation-analytics exports to surface the new metrics alongside the core metrics.
- Added focused tests for extended metrics calculations and edge cases.
