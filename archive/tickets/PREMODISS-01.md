# PREMODISS-01 — Ensemble Model State & Online Bagging

**Status**: Completed
**Depends on**: None
**Blocks**: PREMODISS-02, PREMODISS-03, PREMODISS-04, PREMODISS-05

## Summary

Replace single `(weights, bias)` state with `K` independent models trained via online bagging, matching `specs/preference-model-issues.md` section 1.1.

## Files to touch

- `src/evaluation-analytics/types.ts` — add `ModelSnapshot`, `PreferenceModelEnsemble`, update `PreferenceModelState`
- `src/evaluation-analytics/preference-model.d.ts` — update type exports/options
- `src/evaluation-analytics/preference-model.js` — rewrite `createPreferenceModelState()`, `updatePreferenceModelState()`
- `configs/preference-model.json` — add `ensembleSize`
- `schemas/config/preference-model.schema.json` — add `ensembleSize` property
- `test/unit/evaluation-analytics/preference-model.test.mjs` — update to ensemble state + bagging
- `test/unit/evaluation-analytics/types.test.ts` — update PreferenceModelState shape

## Out of scope

- Scoring logic (PREMODISS-02)
- Active learning selection (PREMODISS-03)
- Fitness blending (PREMODISS-04)
- Persistence store (PREMODISS-05)
- E2E test updates (tracked in PREMODISS-02/03/04)

## Acceptance criteria

- `createPreferenceModelState()` returns state with:
  - `models: Array<{weights, bias, sampleCount}>` of length `ensembleSize`
  - `ensemble: { size: ensembleSize, method: "online-bagging" }`
- `updatePreferenceModelState()` implements online bagging: for each model, draw `k ~ Poisson(1)` using seeded RNG, apply existing update rule `k` times
- State still includes top-level `version`, `sampleCount`, `history`, hyperparams
- Breaking change acknowledged: top-level `weights` and `bias` removed from state
- Determinism invariant: identical seeds + identical feedback → bitwise identical ensemble state
- Tie handling: `preferred = "tie"` → target 0.5 (unchanged semantics)
- Feature-id keyed weights remain the lookup mechanism
- Missing features default to 0
- `tsc -p tsconfig.json` passes
- Unit tests updated to match new state shape and pass

## Tests that must pass

- `test/unit/evaluation-analytics/preference-model.test.mjs` (updated for ensemble state)
- `test/unit/evaluation-analytics/types.test.ts` (updated types)
- `tsc -p tsconfig.json`

## Outcome

- Added ensemble state + online bagging with seeded RNG support and updated config/schema.
- Updated unit tests and type fixtures; deferred scoring/active-learning changes remain scoped to later tickets.
