# PREMODISS-04 — Uncertainty-Damped Fitness Blending

**Status**: Open
**Depends on**: PREMODISS-01, PREMODISS-02
**Blocks**: PREMODISS-06

## Summary

Modify preference contribution to fitness by damping with `(1 - uncertainty)`.

## Files to touch

- `src/evaluation-analytics/scoring.js` — update `computePreferenceContribution()`
- `src/evaluation-analytics/fitness.js` — pass uncertainty through to `combineFitnessScores()`

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
