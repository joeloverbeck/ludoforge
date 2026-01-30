# PREMODISS-02 — Ensemble-Aware Preference Scoring

**Status**: Completed
**Depends on**: PREMODISS-01
**Blocks**: PREMODISS-03, PREMODISS-04, PREMODISS-06

## Summary

Replace single-model sigmoid scoring with per-model scoring, returning `pMean`, `pVar`, `uncertainty`, and `bald`.

## Assumptions & scope corrections

- `computePreferenceScore()` is called both with full `PreferenceModelState` (ensemble) and with a single-model snapshot `{ weights, bias }` inside preference updates; support both shapes to avoid breaking internal callers.
- When no usable models are present, return a neutral score and explicitly set `uncertainty = 1` so `confidence = 0` remains consistent; do not derive uncertainty from variance in this empty-state case.
- Update type declarations so `PreferenceScore` includes the new fields returned by `computePreferenceScore()`.

## Files to touch

- `src/evaluation-analytics/preference-scoring.js` — rewrite `computePreferenceScore()` to iterate ensemble models
- `src/evaluation-analytics/preference-scoring.d.ts` — extend return type
- `src/evaluation-analytics/types.ts` — extend `PreferenceScore` interface
- `test/unit/evaluation-analytics/preference-scoring.test.mjs` — update expectations
- `test/unit/evaluation-analytics/preference-scoring-uncertainty.test.mjs` — new tests

## Out of scope

- Model state structure (PREMODISS-01, assumed done)
- Active learning (PREMODISS-03)
- Fitness blending (PREMODISS-04)
- Persistence (PREMODISS-05)
- Any file not listed above

## Acceptance criteria

- `computePreferenceScore(state, featureVector)` returns `{ score, confidence, pMean, pVar, uncertainty, bald }`
  - `score` = `pMean` (backward compat for callers using `.score`)
  - `confidence` = `1 - uncertainty` (backward compat for callers using `.confidence`)
  - `pMean` = mean of per-model `sigmoid(w_i·x + b_i)`
  - `pVar` = variance of per-model probabilities
  - `uncertainty` = `clamp01(2 * sqrt(pVar))`
  - `bald` = `H(pMean) - mean(H(p_i))` where `H(p) = -p*log(p) - (1-p)*log(1-p)`
- When all models identical → `uncertainty == 0`, `pVar == 0`, `bald == 0`
- When models diverge → `uncertainty > 0`, `pVar > 0`
- Empty/null state still returns `{ score: 0.5, confidence: 0, pMean: 0.5, pVar: 0, uncertainty: 1, bald: 0 }`
- When a single model (legacy snapshot) is provided, it is treated as an ensemble of size 1 (`uncertainty == 0`, `bald == 0`)
- Non-finite values handled safely (no NaN/Infinity in output)

## Tests that must pass

- `test/unit/evaluation-analytics/preference-scoring.test.mjs` (updated)
- New test: `test/unit/evaluation-analytics/preference-scoring-uncertainty.test.mjs`
  - Construct ensemble with all identical models → verify `uncertainty == 0`
  - Construct ensemble with deliberately split weights → verify `uncertainty > 0`
  - Verify `pMean` matches expected mean
  - Verify `bald >= 0`

## Outcome

- Updated `computePreferenceScore()` to support ensemble scoring plus legacy single-model snapshots.
- Expanded `PreferenceScore` to expose `pMean`, `pVar`, `uncertainty`, and `bald`, and added unit coverage for uncertainty behavior and empty-state handling.
