# DIVTERISS-04: (Optional) Add noveltyScore tie-break to shortlist selection

**Status: COMPLETED**

## What

Add optional per-genome `noveltyScore` (mean kNN L1 distance in MAP-Elites coordinate space) used only as a tie-break in shortlist selection. Gated behind `options.useNovelty` (default `false`).

## Files to touch

- `src/evolutionary-engine/engine.js` — add `computeNoveltyScores(candidates, k)` helper (mean k-NN L1 distance, k = min(5, n-1)), insert novelty comparison in tie-break chain after fitness equality and before random key, gate behind `options.useNovelty`
- `test/unit/evolutionary-engine/engine.test.mjs` — add tests: "shortlist tie-break prefers higher novelty when useNovelty is true", "shortlist ignores novelty when useNovelty is false (default)", "novelty tie-break is deterministic with the same seed"

## Out of scope

`scoring.js`, `fitness.js`, fitness formula, `active-learning.js`, making `useNovelty` default to `true`, adding config/schema entries for this

## Acceptance criteria

- Test: With `useNovelty: false` (default), all existing shortlist tests pass unchanged
- Test: With `useNovelty: true`, equal L1-distance + equal fitness → higher novelty score wins
- Test: `computeNoveltyScores` deterministic for fixed input coordinates
- Invariant: `npm run test:unit` passes (1002/1002)
- Invariant: `npm run test:e2e` passes (120/120)

## Dependencies

None (independent of DIVTERISS-01 through DIVTERISS-03)

## Outcome

### What was actually changed vs originally planned

The ticket was implemented as planned with no discrepancies:

1. **`src/evolutionary-engine/engine.js`**: Added `computeNoveltyScores(candidates, k)` helper computing mean k-NN L1 distance (k = min(5, n-1)). Modified `selectShortlist` to accept `useNovelty` option (default `false`), compute novelty scores when enabled, and insert novelty as a tie-break in both the initial sort and the greedy diversity selection loop (after fitness, before random key).

2. **`src/evolutionary-engine/engine.js` (`runGenerationLoop`)**: Passes `useNovelty` from top-level options through to `selectShortlist`.

3. **`test/unit/evolutionary-engine/engine.test.mjs`**: Added 3 new tests in a "shortlist novelty tie-break" describe block. The ticket originally proposed testing `computeNoveltyScores` directly, but since it's an unexported helper, it was tested indirectly through the public `runGenerationLoop` API using carefully constructed scenarios with known binned coordinates and novelty score outcomes.

4. **`docs/architecture/pipeline-overview.md`**: Updated shortlist section (stage 7) to document the tie-break chain and novelty score mechanics.

5. **`docs/architecture/metrics-and-fitness.md`**: Updated the diversity mechanisms list to mention the optional novelty-score tie-break.

All 1002 unit tests and 120 e2e tests pass. No public API changes; the new `useNovelty` option is additive and defaults to `false`.
