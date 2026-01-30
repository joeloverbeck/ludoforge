# PREMODISS-07 — Architecture Documentation Update

**Status**: Completed
**Depends on**: PREMODISS-06
**Blocks**: None

## Summary

Update architectural docs to reflect ensemble model, uncertainty-aware scoring, and information-gain active learning.

## Files to touch

- `docs/architecture/human-feedback.md`
- `docs/architecture/metrics-and-fitness.md`
- `docs/architecture/pipeline-overview.md`
- `docs/architecture/evolutionary-engine.md`

## Out of scope

- All source code
- All test files
- All config/schema files
- `docs/architecture/simulation-engine.md` (unaffected)
- `docs/architecture/e2e-coverage.md` (updated by PREMODISS-06 if needed)
- `docs/architecture/README.md` (unless it references preference model specifics)

## Acceptance criteria

- `human-feedback.md`: describes ensemble model state, online bagging training, BALD-based active learning
- `metrics-and-fitness.md`: describes `uncertainty` replacing `confidence`, uncertainty-damped fitness blending formula
- `pipeline-overview.md`: mentions ensemble if it currently references preference model
- `evolutionary-engine.md`: mentions ensemble if it currently references preference model
- No stale references to single-model `(weights, bias)` or `confidence = abs(score - 0.5) * 2`

## Tests that must pass

- N/A (documentation only)

## Invariants that must remain true

- Docs accurately describe the implemented system (post PREMODISS-01 through 06)

## Outcome

### What changed

- **`docs/architecture/human-feedback.md`**: Updated preference model state to describe ensemble `models[]` array, `ensemble` metadata, online bagging training method, and BALD-based active learning selection (replacing "closest to 0.5" and "low-confidence pairs").
- **`docs/architecture/metrics-and-fitness.md`**: Replaced `Confidence = abs(score - 0.5) * 2` with ensemble-derived scoring (`pMean`, `pVar`, `uncertainty`, `bald`, `confidence = 1 - uncertainty`). Updated fitness blend to document uncertainty-damped preference contribution `weighted * (1 - uncertainty)`.

### What was not changed (vs originally planned)

- **`pipeline-overview.md`**: Already correctly described uncertainty-based prioritization; no update needed.
- **`evolutionary-engine.md`**: Contains no preference model references; no update needed.
- **No code changes**: Documentation-only ticket as intended.
- **No test changes**: N/A per ticket scope.
