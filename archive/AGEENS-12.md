# AGEENS-12: E2E test for adaptive human sampling budget

**Status**: DONE

**Goal**: Prove adaptive budget adjusts correctly across generations.

**Description**: Add an end-to-end style test that exercises adaptive sampling budget decisions while running multi-generation evolution. Use a test-local feedback provider that:
- Builds candidates from generation outputs (mapping nicheId from MAP-Elites placements).
- Injects deterministic feature vectors for preference scoring (runner outputs do not currently surface diagnostics.featureVector).
- Uses fixed preference model states per generation to simulate high vs low uncertainty without production changes.

**Assumptions check (updated)**:
- `createFeedbackProvider` expects `diagnostics.featureVector` and `nicheId` on evaluated entries, but the runner currently nests evaluator diagnostics under `diagnostics.evaluation` and does not attach niche ids to evaluated entries. To avoid production changes, the test will provide candidates directly from generation outputs.
- Diversity-quota selection is already covered in `test/e2e/active-learning.e2e.test.mjs`; this test will still assert underrepresented niches are selected when niche ids are provided.

**Files to touch**:
- `test/e2e/adaptive-human-budget.e2e.test.mjs` (new)
- `docs/architecture/e2e-coverage.md` (add entry)

**Out of scope**:
- No production code changes

**Acceptance criteria**:
- [x] Tests: `node --experimental-test-module-mocks --test test/e2e/adaptive-human-budget.e2e.test.mjs` passes
- [x] High-uncertainty preference state -> higher sampling budget
- [x] Low-uncertainty preference state -> lower sampling budget
- [x] Diversity quota still surfaces underrepresented niches when niche ids are present
- [x] Invariant: all existing tests pass

**Dependencies**: AGEENS-11

**Outcome**:
- Added an E2E-style test that runs the evolution loop with a test-local feedback provider to observe adaptive budget changes and diversity quota behavior.
- Documented the new E2E coverage entry; no production code changes were needed.
