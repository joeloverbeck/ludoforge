# AGEENS-09: Portfolio metrics via suite results

**Status**: TODO

**Goal**: Wire suite-runner results into the new metrics so they use pre-run simulations.

**Description**: Update `computeExtendedMetrics` to accept optional `suiteResults` parameter. When present, route suite results to `computeAdvantageReversalRate` and `computePolicySensitivity` instead of spawning their own simulations. Update evaluator to pass suite results through.

**Files to touch**:
- `src/evaluation-analytics/metrics/extended/aggregation.js` (accept `suiteResults` param)
- `src/evaluation-analytics/create-evaluator.js` (pass `suiteResults` to `computeExtendedMetrics`)
- `test/unit/evaluation-analytics/metrics/extended/aggregation.test.mjs` (add suite-routing tests)

**Out of scope**:
- No `agent_robustness` metric
- No runner-level config changes
- No CLI changes

**Acceptance criteria**:
- [ ] Tests: aggregation unit tests with suite routing pass
- [ ] With `portfolioMetrics.enabled`, metrics receive pre-run results
- [ ] Without `portfolioMetrics.enabled`, behavior identical to before
- [ ] No duplicate simulation calls (verified by run-cache call count)
- [ ] Invariant: all existing tests pass

**Dependencies**: AGEENS-05, AGEENS-06, AGEENS-07
