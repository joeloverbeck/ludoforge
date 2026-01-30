# AGEENS-05: Integrate AgentSuite into evaluator options

**Status**: DONE

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
- [x] Tests: new unit tests pass
- [x] Default behavior (no `agentSuites`) produces identical results to before
- [x] With `portfolioMetrics.enabled` + 2 suites, `diagnostics.suiteResults` keyed by suite ID
- [x] Suite simulations use deterministic seeds via `deriveSeed(baseSeed, suiteId, runIndex)`
- [x] Run cache prevents duplicate simulations
- [x] Invariant: all existing unit + E2E tests pass unchanged

**Dependencies**: AGEENS-02, AGEENS-03, AGEENS-04

---

## Outcome

**What was actually changed vs originally planned:**

The implementation matched the ticket plan exactly. No discrepancies were found between the ticket's assumptions and the codebase.

**Files created:**
- `src/evaluation-analytics/suite-runner.js` — `runSuites()` function that iterates over agent suites, derives deterministic seeds via `deriveSeed(baseSeed, suiteId, runIndex)`, runs simulations through the run cache to prevent duplicates, and adapts results via `adaptSimulationLog`. Handles errors gracefully per suite.
- `test/unit/evaluation-analytics/suite-runner.test.mjs` — 8 tests covering: empty suites, zero run counts, keyed results with trajectory summaries, deterministic output, cache hit verification, multiple suites, fixed seed policy, and error capture.

**Files modified:**
- `src/evaluation-analytics/create-evaluator.js` — Added imports for `createRunCache` and `runSuites`. Added 3 new options (`agentSuites`, `agentSuiteRuns`, `portfolioMetrics`). Added Step 4b after core simulations: when `portfolioMetrics.enabled === true` and suites are provided, creates a run cache, calls `runSuites()`, and spreads `suiteResults` into diagnostics. All 3 diagnostics return paths (normal, non-finite fitness, simulation error) are covered.
- `test/unit/evaluation-analytics/create-evaluator.test.mjs` — Added 5 tests: default has no suiteResults, enabled-but-no-suites has no suiteResults, enabled-with-suites populates keyed results, deterministic suite results, not-enabled skips suites.

**Test results:** 967 unit tests pass (0 failures), clean `tsc` type check.
