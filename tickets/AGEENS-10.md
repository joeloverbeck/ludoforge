# AGEENS-10: E2E test for agent portfolio metrics

**Status**: TODO

**Goal**: Prove portfolio metrics work end-to-end with determinism and caching.

**Description**: Add E2E test configuring evaluator with multiple suites, enabling portfolio + extended metrics. Assert determinism, value ranges, caching efficiency, and feature vector completeness.

**Files to touch**:
- `test/e2e/agent-portfolio-metrics.e2e.test.mjs` (new)
- `test/e2e/fixtures/` (reuse or create fixture with scoring expression)
- `docs/architecture/e2e-coverage.md` (add entry)

**Out of scope**:
- No production code changes
- No adaptive budget testing

**Acceptance criteria**:
- [ ] Tests: `node --test test/e2e/agent-portfolio-metrics.e2e.test.mjs` passes
- [ ] Two evaluations with same seed produce identical metric values
- [ ] `advantage_reversal_rate` deterministic; `policy_sensitivity` within [0,1]
- [ ] Feature vector contains both new metric IDs
- [ ] Invariant: all existing tests pass

**Dependencies**: AGEENS-09
