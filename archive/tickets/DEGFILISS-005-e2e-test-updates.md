# DEGFILISS-005: Update E2E tests for `policyByFlag` model

**Status:** Completed
**Depends on:** DEGFILISS-004
**Blocks:** DEGFILISS-006

## Summary

Update E2E tests to validate the new `policyByFlag` degeneracy model end-to-end, ensuring reject/penalize/ignore semantics work correctly through the full pipeline.

## Reassessed Assumptions

The original ticket listed three files to change:

1. **`test/e2e/mock-fitness.e2e.test.mjs`** — Needs new test cases for reject/penalize semantics using the default policyByFlag config. The existing "gate preference on degeneracy" test uses an explicit `rejectFlags` override (which is valid internal API), but does not exercise the default policy semantics. New tests are needed.

2. **`test/e2e/helpers/mock-fitness.js`** — Originally stated "remove references to `rejectOn`". **Reassessment:** This file does NOT reference `rejectOn`. It calls `applyDegeneracyFilters(degeneracy, options)` where options use `rejectFlags` — the internal parameter of `applyDegeneracyFilters`, not the removed config-level `rejectOn`. The helper needs a small enhancement to pass `degeneracyReport` and `degeneracyPenaltyConfig` through to `computePreferenceAwareFitness` so E2E tests can exercise the penalty path.

3. **`test/e2e/preference-model-update.e2e.test.mjs`** — Originally listed as a file to change. **Reassessment:** This file tests preference model update from real feature vectors and determinism. It has no degeneracy filtering references and requires no changes.

## Files Actually Changed

- `test/e2e/mock-fitness.e2e.test.mjs` — Added 4 new test cases
- `test/e2e/helpers/mock-fitness.js` — Enhanced to forward degeneracyReport/degeneracyPenaltyConfig to fitness

## Out of Scope

- Documentation (DEGFILISS-006)
- Any core source code changes (all done in prior tickets)

## Requirements

### Test Cases

1. **Reject semantics**: `loop` flag causes rejection under default policy.
2. **Reject semantics**: `non-terminating` flag causes rejection under default policy.
3. **Penalize semantics**: `forced-move` flag does NOT reject; fitness is penalized.
4. **Penalize semantics**: `no-choices` flag does NOT reject; fitness is penalized.
5. **Determinism invariant**: Same seeds produce same feature vectors (existing test still passes).

### Test Helpers

- Enhance `mock-fitness.js` to forward `degeneracyReport` and `degeneracyPenaltyConfig` through to `computePreferenceAwareFitness` for penalty path testing.

## Acceptance Criteria

- [x] `loop` flag causes rejection under default policy (test)
- [x] `non-terminating` flag causes rejection under default policy (test)
- [x] `forced-move` flag does NOT reject; fitness is penalized (test)
- [x] `no-choices` flag does NOT reject; fitness is penalized (test)
- [x] Determinism invariant: same seeds produce same feature vectors (existing test passes)
- [x] `npm run test:e2e` passes
- [x] `npm run test:unit` passes

## Outcome

**What changed vs originally planned:**

- The ticket originally listed 3 files to change. Only 2 were actually modified:
  - `test/e2e/preference-model-update.e2e.test.mjs` required no changes (no degeneracy filter references).
  - `test/e2e/helpers/mock-fitness.js` did not have `rejectOn` references to remove; instead it was enhanced to forward `degeneracyReport`/`degeneracyPenaltyConfig` to the fitness computation for penalty path testing.
- 4 new E2E tests added covering all accept/reject/penalize semantics under default `policyByFlag`.
- All 329 unit tests and 34 E2E tests pass.
