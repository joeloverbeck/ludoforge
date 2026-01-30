# DIVTERISS-02: Remove diversityPressure/diversityWeight from fitness.js, config, and schema
Status: Completed (2026-01-30)

## What

Remove all diversity-related reads from `computePreferenceAwareFitness`. Keep `combineFitnessScores` on its existing 3-arg API (options object) and stop passing legacy diversity arguments from fitness. Remove `diversityPressure` and `diversityWeight` from `configs/fitness.json`, `schemas/config/fitness.schema.json`, type declarations, and test helpers.

## Files to touch

- `src/evaluation-analytics/fitness.js` — remove diversity defaults (`diversityPressure`, `diversityWeight`) and stop passing legacy diversity args/options into `combineFitnessScores`
- `src/evaluation-analytics/fitness.d.ts` — remove `diversityPressure` from `PreferenceFitnessOptions`
- `schemas/config/fitness.schema.json` — remove `diversityPressure` and `diversityWeight` from `properties` and `required` arrays
- `configs/fitness.json` — remove `diversityPressure` and `diversityWeight` keys
- `test/unit/evaluation-analytics/fitness.test.mjs` — add/adjust tests to confirm no diversity blend component even if legacy options are supplied
- `test/e2e/helpers/mock-fitness.js` — remove `diversityPressure` forwarding

## Out of scope

`scoring.js` (done in DIVTERISS-01), docs (ticket DIVTERISS-03), `active-learning.js`

## Acceptance criteria

- Test: `computePreferenceAwareFitness({ agency: 0.5 }, {})` returns a result with no `blend.diversity` field
- Test: `computePreferenceAwareFitness` ignores legacy diversity inputs (no `blend.diversity`)
- Test: `configs/fitness.json` validates against updated schema
- Invariant: `npm run test:unit` passes
- Invariant: `npm run test:e2e` passes
- Invariant: `tsc -p tsconfig.json` passes

## Dependencies

DIVTERISS-01

## Outcome
- Removed diversity defaults and legacy diversity forwarding in `computePreferenceAwareFitness`,
  plus config/schema keys and helper wiring.
- Added tests to confirm no diversity blend component and legacy options are ignored, without
  changing `combineFitnessScores` compatibility beyond the fitness caller updates.
