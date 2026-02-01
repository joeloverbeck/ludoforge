# REMHUMINTHELOO-006: Taste vector distillation

**Status**: Completed
**Diff size**: S
**Depends on**: none

## What

New pure function `distillTasteVector()` extracting mean/stddev weights per feature from the ensemble, plus topK positive/negative features.

## Files touched

- `src/evaluation-analytics/taste-vector.js` (NEW)
- `test/unit/evaluation-analytics/taste-vector.test.mjs` (NEW)

## Out of scope

Decision tree distillation. Artifact writing. Controller logic. The broader preference controller system described in `specs/removing-human-in-the-loop.md` (sections 1.1–1.6, freeze/unfreeze, candidate pool, adaptive budget changes) is handled by other tickets.

## Assumptions reassessed

- **Model structure**: Confirmed. `state.models` is `Array<{weights: Record<string, number>, bias: number, sampleCount: number}>`. No changes needed.
- **Feature vectors**: Confirmed. Weights are plain `Record<string, number>` objects. Models may have disjoint feature keys — missing keys are treated as 0.
- **Ensemble**: Confirmed. Ensemble size varies; empty ensemble returns empty features.

## Acceptance criteria

- ✅ Tests: `meanWeight` is arithmetic mean across ensemble models
- ✅ Tests: `stddevWeight` is population stddev
- ✅ Tests: `topPositive`/`topNegative` sorted correctly
- ✅ Tests: empty model returns empty features
- ✅ Tests: single model returns stddev=0
- ✅ Invariant: pure function
- ✅ Invariant: `tsc -p tsconfig.json` passes

## Outcome

**What was actually changed vs originally planned:**

The ticket body contained the full spec from `specs/removing-human-in-the-loop.md` (sections 1.1–3: runner config schema changes, feedback plan function, freeze/unfreeze controller, candidate pool resolution, adaptive budget, integration tests, regression tests). These are **not part of this ticket** — only the taste vector distillation function (section 1.7 of the spec) was in scope.

**Implementation delivered exactly what the ticket header promised:**

1. `src/evaluation-analytics/taste-vector.js` — exports `distillTasteVector(preferenceModelState, options)` which:
   - Collects the union of feature ids across all ensemble models
   - Computes arithmetic mean weight per feature
   - Computes population standard deviation per feature
   - Returns sorted `topPositive` (descending by meanWeight) and `topNegative` (ascending) lists, capped by `topK` (default 5)
   - Handles edge cases: empty models, single model (stddev=0), disjoint feature sets

2. `test/unit/evaluation-analytics/taste-vector.test.mjs` — 14 tests covering all acceptance criteria plus edge cases (disjoint features, zero-mean exclusion, immutability, entry shape validation).

No existing files were modified. No public APIs changed. No breaking changes.
