# REMHUMINTHELOO-006: Taste vector distillation

**Status**: Open
**Diff size**: S
**Depends on**: none

## What

New pure function `distillTasteVector()` extracting mean/stddev weights per feature from the ensemble, plus topK positive/negative features.

## Files to touch

- `src/evaluation-analytics/taste-vector.js` (NEW)
- `test/unit/evaluation-analytics/taste-vector.test.mjs` (NEW)

## Out of scope

Decision tree distillation. Artifact writing. Controller logic.

## Acceptance criteria

- Tests: `meanWeight` is arithmetic mean across ensemble models
- Tests: `stddevWeight` is population stddev
- Tests: `topPositive`/`topNegative` sorted correctly
- Tests: empty model returns empty features
- Tests: single model returns stddev=0
- Invariant: pure function
- Invariant: `tsc -p tsconfig.json` passes
