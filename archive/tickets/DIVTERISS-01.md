# DIVTERISS-01: Remove diversity term from combineFitnessScores
Status: Completed (2026-01-30)

## What

Remove the diversity term from `combineFitnessScores` by dropping the `diversityWeight` option, `DEFAULT_DIVERSITY_WEIGHT` constant, and `diversity` component in the returned `components`. The formula simplifies to `(base + preference) * (1 - penalty)`.

Note: `combineFitnessScores` is still called from `computePreferenceAwareFitness` with the legacy 4-arg signature. To avoid breaking runtime behavior until `DIVTERISS-02` updates those call sites, `combineFitnessScores` must accept both:
- `combineFitnessScores(compositeScore, preferenceScore, options)`
- `combineFitnessScores(compositeScore, preferenceScore, legacyDiversityPressure, options)`

When the legacy 4-arg signature is used, the diversity pressure argument is ignored.

## Files to touch

- `src/evaluation-analytics/scoring.js` — remove `DEFAULT_DIVERSITY_WEIGHT` and diversity contribution math; accept legacy 4-arg calls but ignore the diversity value; remove `diversity` from `components`
- `src/evaluation-analytics/scoring.d.ts` — remove `diversityWeight` from `FitnessBlendOptions`, remove `diversity` from `FitnessBlendComponents`, change `combineFitnessScores` signature to the 3-arg form
- `test/unit/evaluation-analytics/scoring.test.mjs` — update/remove diversity-related assertions, adjust expected scores, and add coverage that `components` omits `diversity`
- `test/unit/evaluation-analytics/fitness.test.mjs` — drop assertions that expect `blend.diversity` in diagnostics (since `combineFitnessScores` no longer returns it)

## Out of scope

`fitness.js`, config, schema, docs, `active-learning.js` (handled in `DIVTERISS-02` / `DIVTERISS-03`)

## Acceptance criteria

- Test: `combineFitnessScores(0.5, 1, { allowPreference: false })` returns `score: 0.5` (base only)
- Test: `combineFitnessScores(0.6, null, { degeneracyPenalty: 0.3 })` returns score ~0.42
- Test: Penalty 1.0 still zeroes fitness
- Test: Legacy call `combineFitnessScores(0.5, 1, 0.2, { allowPreference: false })` ignores diversity and returns `score: 0.5`
- Invariant: `components` no longer contains `diversity` key
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None

## Outcome
- Removed diversity contribution from `combineFitnessScores` (and its components) while keeping
  backward-compatible handling for the legacy 4-arg signature.
- Updated scoring types/tests and fitness diagnostics tests to align with the removed diversity
  component.
