# AGEENS-09: Portfolio metrics via suite results

**Status**: DONE

**Goal**: Wire suite-runner results into the new metrics so they can reuse pre-run simulations when available.

**Description**: Update `computeExtendedMetrics` to accept an optional `suiteResults` parameter. When present, route suite results to `computeAdvantageReversalRate` and `computePolicySensitivity` when a matching suite can be found; otherwise fall back to the current simulation-based behavior. Update evaluator to pass suite results through.

**Files to touch**:
- `src/evaluation-analytics/metrics/extended/aggregation.js` (accept `suiteResults` param)
- `src/evaluation-analytics/metrics/extended/policy-sensitivity.js` (allow suite-result reuse when matchups are available)
- `src/evaluation-analytics/suite-runner.js` (include enough suite metadata to match results to agents)
- `src/evaluation-analytics/create-evaluator.js` (pass `suiteResults` to `computeExtendedMetrics`)
- `test/unit/evaluation-analytics/extended-metrics.test.mjs` (add suite-routing tests)
- `test/unit/evaluation-analytics/policy-sensitivity-suite-routing.test.mjs` (verify suite reuse without spawning sims)

**Out of scope**:
- No `agent_robustness` metric
- No runner-level config changes
- No CLI changes

**Acceptance criteria**:
- [ ] Tests: suite-routing unit tests in `test/unit/evaluation-analytics/extended-metrics.test.mjs` pass
- [ ] When `suiteResults` are provided *and* match the needed agent matchups, `advantage_reversal_rate` / `policy_sensitivity` reuse those results
- [ ] When `suiteResults` are missing or incomplete, metrics fall back to existing simulation-based behavior
- [ ] No duplicate simulation calls when suite reuse is possible (verified by a stubbed `runBatchSimulations`)
- [ ] Invariant: all existing tests pass

**Dependencies**: AGEENS-05, AGEENS-06, AGEENS-07 (archived)

---

## Outcome

**What was actually changed vs originally planned:**
- Suite reuse is now conditional: advantage reversal uses a specified `suiteId` (or single suite), and policy sensitivity reuses suite results only when agent matchups can be found; otherwise it falls back to simulation-based behavior.
- Suite runner now returns `agents` alongside `results` and `trajectorySummaries` to make matchup matching possible.
- Added targeted unit tests for suite routing in extended metrics and policy sensitivity.
