# AGEENS-13: Architecture documentation update

**Status**: TODO

**Goal**: Keep `docs/architecture/` current with all new concepts.

**Description**: Update all relevant arch docs to reflect AgentSuite, portfolio metrics, run cache, seed derivation, new metrics, and adaptive budget.

**Files to touch**:
- `docs/architecture/metrics-and-fitness.md` (AgentSuite, advantage_reversal_rate, policy_sensitivity, portfolio metrics)
- `docs/architecture/pipeline-overview.md` (suite runner step, run cache)
- `docs/architecture/simulation-engine.md` (seed derivation, run cache)
- `docs/architecture/evolution-runner.md` (adaptive budget)
- `docs/architecture/human-feedback.md` (adaptive sampling budget)
- `docs/architecture/e2e-coverage.md` (verify all new E2E tests listed)
- `docs/architecture/README.md` (update if config mapping changed)

**Out of scope**:
- No code changes

**Acceptance criteria**:
- [ ] All new concepts documented: AgentSuite, portfolio metrics, run cache, seed derivation, advantage_reversal_rate, policy_sensitivity, adaptive budget
- [ ] No broken internal cross-references
- [ ] Existing doc accuracy preserved
- [ ] Invariant: no code changes

**Dependencies**: AGEENS-10, AGEENS-12
