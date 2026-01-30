# AGEENS-13: Architecture documentation update

**Status**: DONE

**Goal**: Keep `docs/architecture/` current with all new concepts.

**Description**: Update all relevant arch docs to reflect AgentSuite, portfolio metrics, run cache, seed derivation, new metrics, and adaptive budget.

**Files touched**:
- `docs/architecture/metrics-and-fitness.md` (AgentSuite, suite runner, advantage_reversal_rate, policy_sensitivity, portfolio metrics, evaluator options)
- `docs/architecture/pipeline-overview.md` (suite runner step, run cache, deriveSeed)
- `docs/architecture/simulation-engine.md` (seed derivation, run cache)
- `docs/architecture/evolution-runner.md` (adaptive budget)
- `docs/architecture/human-feedback.md` (adaptive sampling budget)
- `docs/architecture/e2e-coverage.md` — already current, no changes needed
- `docs/architecture/README.md` — already current (`agent-suites.json` already listed), no changes needed

**Out of scope**:
- No code changes

**Acceptance criteria**:
- [x] All new concepts documented: AgentSuite, portfolio metrics, run cache, seed derivation, advantage_reversal_rate, policy_sensitivity, adaptive budget
- [x] No broken internal cross-references
- [x] Existing doc accuracy preserved
- [x] Invariant: no code changes

**Dependencies**: AGEENS-10, AGEENS-12

## Outcome

All 7 concepts from the acceptance criteria are now documented across 5 architecture docs:

1. **AgentSuite** — new section in `metrics-and-fitness.md` documenting the type, validation, and config loading.
2. **Suite Runner** — new section in `metrics-and-fitness.md` documenting `runSuites()`, run caching, and suite result structure. Also referenced in `pipeline-overview.md` stage 3.
3. **Run Cache** — new section in `simulation-engine.md` documenting `createRunCache()` and `getOrRun()` API.
4. **Seed Derivation** — new section in `simulation-engine.md` documenting `deriveSeed()` FNV-1a algorithm. Also referenced in `pipeline-overview.md` determinism controls.
5. **advantage_reversal_rate** — new extended metric entry in `metrics-and-fitness.md`.
6. **policy_sensitivity** — new extended metric entry in `metrics-and-fitness.md`.
7. **Adaptive Budget** — new subsection in `evolution-runner.md` under Human Feedback Integration, and new section in `human-feedback.md` after Active Learning.

Two files (`e2e-coverage.md`, `README.md`) were already current and required no changes.
Evaluator options table and pipeline steps updated with `portfolioMetrics`, `agentSuites`, `agentSuiteRuns`, and step 4b.
