# DIVTERISS-02: Remove diversityPressure/diversityWeight from fitness.js, config, and schema

## What

Remove all diversity-related reads from `computePreferenceAwareFitness`. Update the call to `combineFitnessScores` (now 3-arg). Remove `diversityPressure` and `diversityWeight` from `configs/fitness.json`, `schemas/config/fitness.schema.json`, type declarations, and test helpers.

## Files to touch

- `src/evaluation-analytics/fitness.js` — remove lines 69 (`diversityPressure`), 76 (`diversityWeight`), remove arg at line 92, remove `diversityWeight` from options at line 101
- `src/evaluation-analytics/fitness.d.ts` — remove `diversityPressure` from `PreferenceFitnessOptions`
- `schemas/config/fitness.schema.json` — remove `diversityPressure` and `diversityWeight` from `properties` and `required` arrays
- `configs/fitness.json` — remove `diversityPressure` and `diversityWeight` keys
- `test/unit/evaluation-analytics/fitness.test.mjs` — remove `diversityPressure: 0.2` and `diversityWeight: 2` from options at lines 87-88, remove assertion on `blend.diversity`
- `test/e2e/helpers/mock-fitness.js` — remove `diversityPressure` forwarding at lines 89-90

## Out of scope

`scoring.js` (done in DIVTERISS-01), docs (ticket DIVTERISS-03), `active-learning.js`

## Acceptance criteria

- Test: `computePreferenceAwareFitness({ agency: 0.5 }, {})` returns a result with no `blend.diversity` field
- Test: `configs/fitness.json` validates against updated schema
- Invariant: `npm run test:unit` passes
- Invariant: `npm run test:e2e` passes
- Invariant: `tsc -p tsconfig.json` passes

## Dependencies

DIVTERISS-01
