# AGEENS-05: Integrate AgentSuite into evaluator options

**Status**: TODO

**Goal**: Extend `createEvaluator()` to accept suites and run suite simulations.

**Description**: Add options `agentSuites`, `agentSuiteRuns`, `portfolioMetrics: { enabled }`. When enabled, run additional simulations per suite using `deriveSeed` and `runCache`. Store suite results in `diagnostics.suiteResults`. Default behavior (no suites) is identical to current.

**Files to touch**:
- `src/evaluation-analytics/create-evaluator.js` (modify — add suite options + wire suite-runner)
- `src/evaluation-analytics/suite-runner.js` (new — orchestrates per-suite simulation batches)
- `test/unit/evaluation-analytics/suite-runner.test.mjs` (new)
- `test/unit/evaluation-analytics/create-evaluator.test.mjs` (add tests for new options)

**Out of scope**:
- No new metrics computed from suite results (that's AGEENS-09)
- No runner config changes
- No CLI changes
- No schema changes to `metrics-extended.schema.json`

**Acceptance criteria**:
- [ ] Tests: new unit tests pass
- [ ] Default behavior (no `agentSuites`) produces identical results to before
- [ ] With `portfolioMetrics.enabled` + 2 suites, `diagnostics.suiteResults` keyed by suite ID
- [ ] Suite simulations use deterministic seeds via `deriveSeed(baseSeed, suiteId, runIndex)`
- [ ] Run cache prevents duplicate simulations
- [ ] Invariant: all existing unit + E2E tests pass unchanged

**Dependencies**: AGEENS-02, AGEENS-03, AGEENS-04
