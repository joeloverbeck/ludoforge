# PREMODISS-04 — Uncertainty-Damped Fitness Blending

**Status**: Completed
**Depends on**: PREMODISS-01, PREMODISS-02
**Blocks**: PREMODISS-06

## Summary

Modify preference contribution to fitness by damping with `(1 - uncertainty)`.

## Files to touch

- `src/evaluation-analytics/scoring.js` — update `computePreferenceContribution()` to damp by `(1 - uncertainty)`; `combineFitnessScores()` forwards the new `preferenceUncertainty` option
- `src/evaluation-analytics/fitness.js` — pass `preferenceScore.uncertainty` into `combineFitnessScores()` options and expose `preferenceUncertainty` in diagnostics

## Out of scope

- Ensemble state (PREMODISS-01)
- Scoring internals (PREMODISS-02, used as a dependency)
- Active learning (PREMODISS-03)
- Persistence (PREMODISS-05)
- `computeCompositeScore()` (unchanged)
- `resolvePreferenceCap()` / bootstrap logic (unchanged)
- Degeneracy penalty computation (unchanged)
- Any file not listed above

## Acceptance criteria

- `preferenceContribution = centered(pMean) * preferenceWeight * (1 - uncertainty)`, then clamped
- When `uncertainty == 0` (confident ensemble) → full contribution (same as today)
- When `uncertainty == 1` (total disagreement) → zero contribution
- Existing caps/bootstrapping logic preserved
- Degeneracy/safety gating behavior unchanged
- Preference contribution remains bounded: `[-cap, cap]`
- `diagnostics` in fitness output includes `preferenceUncertainty` field

## Tests that must pass

- `test/unit/evaluation-analytics/fitness.test.mjs` (updated)
- `test/unit/evaluation-analytics/scoring.test.mjs` (if exists, updated)
- Verify: high-uncertainty ensemble → preference contribution damped toward 0
- Verify: zero-uncertainty ensemble → preference contribution identical to old behavior

## Outcome

### Ticket corrections applied before implementation

The original ticket stated `fitness.js` contains `combineFitnessScores()` — it actually lives in `scoring.js`. The "Files to touch" section was corrected to clarify that `scoring.js` owns both `computePreferenceContribution()` and `combineFitnessScores()`, while `fitness.js` orchestrates the call and exposes diagnostics.

### What was changed

**`src/evaluation-analytics/scoring.js`** (2 lines added):
- `computePreferenceContribution()` now reads `options.preferenceUncertainty`, clamps it to [0,1], and multiplies `weighted` by `(1 - uncertainty)` before clamping to cap. When the option is absent or non-finite, it defaults to 0 (no damping), preserving backward compatibility.

**`src/evaluation-analytics/fitness.js`** (2 lines added):
- `computePreferenceAwareFitness()` extracts `preferenceScore.uncertainty` and passes it as `preferenceUncertainty` in the `combineFitnessScores()` options.
- Diagnostics output now includes `preferenceUncertainty` (or `null` when no model state).

### Tests added

**`test/unit/evaluation-analytics/scoring.test.mjs`** — 4 new tests:
1. `damps preference contribution by (1 - uncertainty)` — zero vs full uncertainty
2. `partially damps preference at intermediate uncertainty` — 0.5 uncertainty halves contribution
3. `clamps uncertainty to [0, 1] range` — out-of-range values are safe
4. `preserves old behavior when preferenceUncertainty is absent` — backward compat

**`test/unit/evaluation-analytics/fitness.test.mjs`** — 4 new tests:
1. `damps preference toward zero when ensemble uncertainty is high` — split-weight ensemble
2. `preserves full preference when ensemble uncertainty is zero` — identical models
3. `includes preferenceUncertainty in diagnostics` — field presence and bounds
4. `reports null preferenceUncertainty when no model state` — absent model path

All 785 unit tests pass. No public API signatures changed. No breaking changes.
