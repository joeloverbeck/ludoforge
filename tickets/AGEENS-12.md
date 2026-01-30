# AGEENS-12: E2E test for adaptive human sampling budget

**Status**: TODO

**Goal**: Prove adaptive budget adjusts correctly across generations.

**Description**: Run multi-generation evolution with human feedback + adaptive budget. Assert budget changes direction based on uncertainty, and diversity quota still works.

**Files to touch**:
- `test/e2e/adaptive-human-budget.e2e.test.mjs` (new)
- `docs/architecture/e2e-coverage.md` (add entry)

**Out of scope**:
- No production code changes

**Acceptance criteria**:
- [ ] Tests: `node --test test/e2e/adaptive-human-budget.e2e.test.mjs` passes
- [ ] Empty preference model (high uncertainty) -> higher sampling
- [ ] After training with low uncertainty -> lower sampling
- [ ] Diversity quota still surfaces underrepresented niches
- [ ] Invariant: all existing tests pass

**Dependencies**: AGEENS-11
