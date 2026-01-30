# DIVTERISS-04: (Optional) Add noveltyScore tie-break to shortlist selection

## What

Add optional per-genome `noveltyScore` (mean kNN L1 distance in MAP-Elites coordinate space) used only as a tie-break in shortlist selection. Gated behind `options.useNovelty` (default `false`).

## Files to touch

- `src/evolutionary-engine/engine.js` — add `computeNoveltyScores(candidates, k)` helper (mean k-NN L1 distance, k = min(5, n-1)), insert novelty comparison in tie-break chain after fitness equality and before random key, gate behind `options.useNovelty`
- `test/unit/evolutionary-engine/engine.test.mjs` — add tests: "shortlist tie-break prefers higher novelty when useNovelty is true", "shortlist ignores novelty when useNovelty is false (default)", "computeNoveltyScores returns correct mean kNN distances"

## Out of scope

`scoring.js`, `fitness.js`, fitness formula, `active-learning.js`, making `useNovelty` default to `true`, adding config/schema entries for this

## Acceptance criteria

- Test: With `useNovelty: false` (default), all existing shortlist tests pass unchanged
- Test: With `useNovelty: true`, equal L1-distance + equal fitness → higher novelty score wins
- Test: `computeNoveltyScores` deterministic for fixed input coordinates
- Invariant: `npm run test:unit` passes
- Invariant: `npm run test:e2e` passes

## Dependencies

None (independent of DIVTERISS-01 through DIVTERISS-03)
